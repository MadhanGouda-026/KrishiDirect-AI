
import { useCallback, useEffect, useRef, useState } from 'react';

let demoUser = (() => {
  try {
    return localStorage.getItem('kd_user') || 'b1';
  } catch {
    return 'b1';
  }
})();

const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

export const getApiUser = () => demoUser;

export const setApiUser = (id) => {
  demoUser = id;

  try {
    localStorage.setItem('kd_user', id);
  } catch {
    // Ignore localStorage errors
  }
};

export async function api(path, { method = 'GET', body } = {}) {
  let res;

  // Ensure the API path starts with exactly one slash.
  const apiPath = `/api${path.startsWith('/') ? path : `/${path}`}`;
  const url = `${API_URL}${apiPath}`;

  try {
    res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-demo-user': demoUser,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    const e = new Error('Network request failed. Please check your connection.');
    e.code = 'network';
    throw e;
  }

  let data = null;

  try {
    data = await res.json();
  } catch {
    // Response may have no JSON body
  }

  if (!res.ok) {
    const e = new Error(data?.error || res.statusText || 'Server error');
    e.code = data?.error || 'serverError';
    e.status = res.status;
    e.fields = data?.fields;
    throw e;
  }

  return data;
}

/**
 * GET helper with loading/error state.
 * Pass null path to skip fetching.
 */
export function useFetch(path, deps = []) {
  const [state, setState] = useState({
    data: null,
    loading: !!path,
    error: null,
  });

  const seq = useRef(0);

  const load = useCallback(async () => {
    if (!path) {
      setState({
        data: null,
        loading: false,
        error: null,
      });
      return;
    }

    const n = ++seq.current;

    setState((s) => ({
      ...s,
      loading: true,
      error: null,
    }));

    try {
      const data = await api(path);

      if (n === seq.current) {
        setState({
          data,
          loading: false,
          error: null,
        });
      }
    } catch (error) {
      if (n === seq.current) {
        setState({
          data: null,
          loading: false,
          error,
        });
      }
    }
  }, [path, ...deps]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    load();

    return () => {
      seq.current += 1;
    };
  }, [load]);

  return {
    ...state,
    reload: load,
  };
}
