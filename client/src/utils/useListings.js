import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useApp } from '../context/AppContext.jsx';

export function useListingsByIds(ids) {
  const { userId } = useApp();
  const [state, setState] = useState({ items: [], loading: true });
  const sig = ids.join(',');
  useEffect(() => {
    let live = true;
    setState((s) => ({ ...s, loading: true }));
    Promise.all(ids.map((id) => api(`/listings/${id}`).then((r) => r.listing).catch(() => null))).then((r) => live && setState({ items: r.filter(Boolean), loading: false }));
    return () => { live = false; };
  }, [sig, userId]); // eslint-disable-line react-hooks/exhaustive-deps
  return state;
}

