import { useCallback, useEffect, useRef, useState } from 'react';

let demoUser = (() => { try { return localStorage.getItem('kd_user') || 'b1'; } catch { return 'b1'; } })();
export const getApiUser = () => demoUser;
export const setApiUser = (id) => { demoUser = id; try { localStorage.setItem('kd_user', id); } catch { /* ignore */ } };

export async function api(path, { method = 'GET', body } = {}) {
  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', 'x-demo-user': demoUser },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    const e = new Error('network'); e.code = 'network'; throw e;
  }
  let data = null;
  try { data = await res.json(); } catch { /* empty */ }
  if (!res.ok) {
    const e = new Error(data?.error || res.statusText);
    e.code = data?.error || 'serverError'; e.status = res.status; e.fields = data?.fields;
    throw e;
  }
  return data;
}

/** GET helper with loading/error state. Pass null path to skip. */
export function useFetch(path, deps = []) {
  const [state, setState] = useState({ data: null, loading: !!path, error: null });
  const seq = useRef(0);
  const load = useCallback(async () => {
    if (!path) return;
    const n = ++seq.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await api(path);
      if (n === seq.current) setState({ data, loading: false, error: null });
    } catch (error) {
      if (n === seq.current) setState({ data: null, loading: false, error });
    }
  }, [path, ...deps]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [load]);
  return { ...state, reload: load };
}
