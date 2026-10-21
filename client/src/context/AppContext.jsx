import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api, setApiUser, getApiUser } from '../api/client.js';
import { ConfirmDialog } from '../components/ui/Overlays.jsx';

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

const readJson = (k, fallback) => { try { return JSON.parse(localStorage.getItem(k)) ?? fallback; } catch { return fallback; } };
const writeJson = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } };
const EMPTY_PREFS = { wishlist: [], compare: [], recent: [], searches: [] };

export function AppProvider({ children }) {
  const { t } = useTranslation();
  const [users, setUsers] = useState([]);
  const [userId, setUserId] = useState(getApiUser());
  const [meta, setMeta] = useState(null);
  const [theme, setTheme] = useState(() => document.documentElement.getAttribute('data-theme') || 'light');
  const [toasts, setToasts] = useState([]);
  const [unread, setUnread] = useState(0);
  const [version, setVersion] = useState(0); // bump to refetch shared data
  const [prefs, setPrefs] = useState(() => readJson(`kd_prefs_${getApiUser()}`, EMPTY_PREFS));
  const [confirmState, setConfirmState] = useState(null);
  const confirmResolve = useRef(null);

  const loadBase = useCallback(async () => {
    try {
      const [u, m] = await Promise.all([api('/users'), api('/meta')]);
      setUsers(u); setMeta(m);
    } catch { /* surfaced by pages */ }
  }, []);
  useEffect(() => { loadBase(); }, [loadBase]);

  const refreshUnread = useCallback(async () => {
    try { const n = await api('/notifications'); setUnread(n.filter((x) => !x.read).length); } catch { /* ignore */ }
  }, []);
  useEffect(() => { refreshUnread(); }, [refreshUnread, userId, version]);

  const user = useMemo(() => users.find((u) => u.id === userId) || null, [users, userId]);
  const switchUser = useCallback((id) => {
    setApiUser(id); setUserId(id); setPrefs(readJson(`kd_prefs_${id}`, EMPTY_PREFS)); setVersion((v) => v + 1);
  }, []);
  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  const toggleTheme = useCallback(() => {
    setTheme((cur) => {
      const next = cur === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem('kd_theme', next); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const toast = useCallback((message, type = 'success') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((x) => [...x, { id, message, type }]);
    setTimeout(() => setToasts((x) => x.filter((y) => y.id !== id)), 4500);
  }, []);
  const dismissToast = useCallback((id) => setToasts((x) => x.filter((y) => y.id !== id)), []);
  /** Translate an API error into a toast. */
  const fail = useCallback((e) => toast(e?.fields ? t('err.validation') : t(`err.${e?.code || 'serverError'}`, { defaultValue: t('err.serverError') }), 'error'), [toast, t]);

  const updatePrefs = useCallback((fn) => {
    setPrefs((p) => { const n = fn(p); writeJson(`kd_prefs_${userId}`, n); return n; });
  }, [userId]);
  const toggleWish = useCallback((id) => updatePrefs((p) => ({ ...p, wishlist: p.wishlist.includes(id) ? p.wishlist.filter((x) => x !== id) : [...p.wishlist, id] })), [updatePrefs]);
  const toggleCompare = useCallback((id) => {
    let msg = null;
    updatePrefs((p) => {
      if (p.compare.includes(id)) return { ...p, compare: p.compare.filter((x) => x !== id) };
      if (p.compare.length >= 4) { msg = 'compare.max'; return p; }
      return { ...p, compare: [...p.compare, id] };
    });
    if (msg) toast(t(msg), 'info');
  }, [updatePrefs, toast, t]);
  const pushRecent = useCallback((id) => updatePrefs((p) => ({ ...p, recent: [id, ...p.recent.filter((x) => x !== id)].slice(0, 8) })), [updatePrefs]);
  const pushSearch = useCallback((q) => { if (q?.trim()) updatePrefs((p) => ({ ...p, searches: [q.trim(), ...p.searches.filter((x) => x !== q.trim())].slice(0, 6) })); }, [updatePrefs]);
  const clearSearches = useCallback(() => updatePrefs((p) => ({ ...p, searches: [] })), [updatePrefs]);

  const confirm = useCallback((opts) => new Promise((resolve) => { confirmResolve.current = resolve; setConfirmState(opts); }), []);
  const closeConfirm = (v) => { confirmResolve.current?.(v); setConfirmState(null); };

  const value = { user, users, userId, switchUser, meta, theme, toggleTheme, toasts, toast, dismissToast, fail, unread, refresh, refreshUnread, version, prefs, toggleWish, toggleCompare, pushRecent, pushSearch, clearSearches, confirm, loadBase };
  return (
    <Ctx.Provider value={value}>
      {children}
      <ConfirmDialog state={confirmState} onClose={closeConfirm} />
    </Ctx.Provider>
  );
}
