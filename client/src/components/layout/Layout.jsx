import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useApp } from '../../context/AppContext.jsx';
import { api } from '../../api/client.js';
import { Dropdown, Drawer } from '../ui/Overlays.jsx';
import { Button } from '../ui/Primitives.jsx';
import { Toasts, ErrorBoundary } from '../ui/Feedback.jsx';
import { Logo } from '../Art.jsx';
import { LANGUAGES } from '../../i18n/index.js';
import { ago } from '../../utils/format.js';

const MAIN = [
  ['/', 'nav.home', true], ['/marketplace', 'nav.marketplace'], ['/sell', 'nav.sell'], ['/prices', 'nav.prices'],
  ['/farmer', 'nav.farmers'], ['/buyer', 'nav.buyers'],
];
const MORE = [
  ['/offers', 'nav.offers'], ['/orders', 'nav.orders'], ['/messages', 'nav.messages'], ['/wishlist', 'nav.wishlist'], ['/compare', 'nav.compare'],
  ['/markets', 'nav.markets'], ['/assistant', 'nav.assistant'], ['/analytics', 'nav.analytics'], ['/resources', 'nav.resources'], ['/demo', 'nav.demoTools'],
];

function NotifMenu() {
  const { t } = useTranslation();
  const { unread, refreshUnread, version } = useApp();
  const [items, setItems] = useState([]);
  const load = () => api('/notifications').then((n) => setItems(n.slice(0, 6))).catch(() => {});
  useEffect(() => { load(); }, [version]); // eslint-disable-line react-hooks/exhaustive-deps
  const markAll = async () => { await api('/notifications/read-all', { method: 'POST' }); load(); refreshUnread(); };
  return (
    <Dropdown label={`${t('nav.notifications')}${unread ? ` (${unread})` : ''}`} onOpen={load} button={<><span aria-hidden="true">🔔</span>{unread > 0 && <span className="dot" aria-hidden="true">{unread > 9 ? '9+' : unread}</span>}</>}>
      <div className="row between" style={{ padding: '4px 10px' }}><strong>{t('nav.notifications')}</strong>{unread > 0 && <button className="btn ghost sm" onClick={markAll}>{t('notif.markAll')}</button>}</div>
      {items.length === 0 && <p className="muted small" style={{ padding: 10 }}>{t('notif.empty')}</p>}
      {items.map((n) => (
        <Link key={n.id} className="item" to={n.link || '/notifications'} data-close style={{ fontWeight: n.read ? 400 : 700 }}>
          <span aria-hidden="true">{n.read ? '○' : '●'}</span>
          <span className="grow small">{t(`notif.${n.type}`, n.data)}<br /><span className="muted">{ago(n.at, t)}</span></span>
        </Link>
      ))}
      <Link className="item" to="/notifications" data-close style={{ justifyContent: 'center', fontWeight: 600 }}>{t('common.viewAll')}</Link>
    </Dropdown>
  );
}

function IdentityMenu() {
  const { t } = useTranslation();
  const { user, users, switchUser } = useApp();
  const navigate = useNavigate();
  const farmers = users.filter((u) => u.role === 'farmer');
  const buyers = users.filter((u) => u.role === 'buyer');
  const pick = (u) => { switchUser(u.id); navigate(u.role === 'farmer' ? '/farmer' : '/buyer'); };
  const row = (u) => (
    <button key={u.id} className={`item ${user?.id === u.id ? 'on' : ''}`} data-close onClick={() => pick(u)}>
      <span aria-hidden="true">{u.role === 'farmer' ? '🧑‍🌾' : '🛒'}</span><span className="grow">{u.name}<br /><span className="muted small">{t(`demo.${u.role}`)}</span></span>{user?.id === u.id && <span aria-label={t('demo.current')}>✓</span>}
    </button>
  );
  return (
    <Dropdown label={t('demo.identity')} button={<span aria-hidden="true">{user?.role === 'farmer' ? '🧑‍🌾' : '🛒'}</span>}>
      <p className="small muted" style={{ margin: '4px 10px' }}>{t('demo.identityNote')}</p>
      <h4>{t('demo.farmers')}</h4>{farmers.map(row)}
      <h4>{t('demo.buyers')}</h4>{buyers.map(row)}
      <Link className="item" to="/demo" data-close>⚙️ {t('nav.demoTools')}</Link>
    </Dropdown>
  );
}

function SearchBox() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const navigate = useNavigate();
  if (!open) return <button className="btn ghost icon" aria-label={t('nav.search')} onClick={() => setOpen(true)}><span aria-hidden="true">🔍</span></button>;
  return (
    <form role="search" onSubmit={(e) => { e.preventDefault(); navigate(`/marketplace?q=${encodeURIComponent(q)}`); setOpen(false); setQ(''); }} style={{ display: 'flex' }}>
      <input autoFocus className="input" style={{ minHeight: 40, width: 'min(46vw, 220px)', borderRadius: 999 }} value={q} onChange={(e) => setQ(e.target.value)} onBlur={() => !q && setOpen(false)} placeholder={t('hero.searchPh')} aria-label={t('nav.search')} />
    </form>
  );
}

export function Navbar() {
  const { t, i18n } = useTranslation();
  const { theme, toggleTheme } = useApp();
  const [menu, setMenu] = useState(false);
  const loc = useLocation();
  const navigate = useNavigate();
  useEffect(() => setMenu(false), [loc.pathname]);
  return (
    <header className="nav">
      <a className="skip" href="#main">{t('common.skip')}</a>
      <div className="container nav-in">
        <button className="btn ghost icon burger" aria-label={t('nav.menu')} aria-expanded={menu} onClick={() => setMenu(true)}><span aria-hidden="true">☰</span></button>
        <Link to="/" className="logo" aria-label="KrishiDirect AI"><Logo /><span>Krishi<small>Direct</small> AI</span></Link>
        <nav className="nav-links" aria-label="Main">
          {MAIN.map(([to, k, end]) => <NavLink key={to} to={to} end={end}>{t(k)}</NavLink>)}
          <Dropdown align="left" label={t('nav.more')} className="more-btn" button={<span style={{ fontSize: '.9rem', padding: '0 10px' }}>{t('nav.more')} ▾</span>}>
            {MORE.map(([to, k]) => <Link key={to} className="item" to={to} data-close>{t(k)}</Link>)}
          </Dropdown>
        </nav>
        <div className="nav-tools">
          <span className="hide-xs"><SearchBox /></span>
          <select aria-label={t('nav.language')} value={i18n.language} onChange={(e) => i18n.changeLanguage(e.target.value)}>
            {LANGUAGES.map((l) => <option key={l} value={l}>{t(`lang.${l}`)}</option>)}
          </select>
          <NotifMenu />
          <button className="btn ghost icon hide-xs" aria-label={t('nav.theme')} aria-pressed={theme === 'dark'} onClick={toggleTheme}><span aria-hidden="true">{theme === 'dark' ? '☀️' : '🌙'}</span></button>
          <Link to="/demo" className="badge demo-pill" title={t('demo.banner')}>{t('demo.mode')}</Link>
          <IdentityMenu />
        </div>
      </div>
      <Drawer open={menu} onClose={() => setMenu(false)} title="KrishiDirect AI">
        <div className="row" style={{ marginBottom: 12 }}>
          <Button variant="outline" size="sm" onClick={toggleTheme} aria-pressed={theme === 'dark'}>{theme === 'dark' ? '☀️' : '🌙'} {t('nav.theme')}</Button>
        </div>
        <form role="search" onSubmit={(e) => { e.preventDefault(); const q = new FormData(e.currentTarget).get('q'); setMenu(false); navigate(`/marketplace?q=${encodeURIComponent(q)}`); }} style={{ marginBottom: 8 }}>
          <input name="q" className="input" placeholder={t('hero.searchPh')} aria-label={t('nav.search')} />
        </form>
        <nav className="drawer-links" aria-label="Mobile">
          {[...MAIN, ...MORE].map(([to, k, end]) => <NavLink key={to} to={to} end={end}>{t(k)}</NavLink>)}
          <NavLink to="/help">{t('nav.help')}</NavLink><NavLink to="/about">{t('nav.about')}</NavLink><NavLink to="/contact">{t('nav.contact')}</NavLink>
        </nav>
      </Drawer>
    </header>
  );
}

export function BottomNav() {
  const { t } = useTranslation();
  const items = [['/', '🏠', 'nav.home', true], ['/marketplace', '🛍️', 'nav.marketplace'], ['/sell', '🌾', 'nav.sell'], ['/prices', '📈', 'nav.prices'], ['/orders', '📦', 'nav.orders']];
  return (
    <nav className="bottom-nav" aria-label="Quick">
      {items.map(([to, em, k, end]) => <NavLink key={to} to={to} end={end}><span className="em" aria-hidden="true">{em}</span>{t(k)}</NavLink>)}
    </nav>
  );
}

export function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="footer">
      <div className="container grid g4" style={{ gap: 28 }}>
        <div><div className="logo" style={{ marginBottom: 8 }}><Logo /> KrishiDirect AI</div><p className="small">{t('app.support')}</p><p className="small">{t('footer.mission')}</p></div>
        <div><h4>{t('footer.platform')}</h4><ul><li><Link to="/marketplace">{t('nav.marketplace')}</Link></li><li><Link to="/sell">{t('nav.sell')}</Link></li><li><Link to="/prices">{t('nav.prices')}</Link></li><li><Link to="/markets">{t('nav.markets')}</Link></li><li><Link to="/resources">{t('nav.resources')}</Link></li></ul></div>
        <div><h4>{t('footer.company')}</h4><ul><li><Link to="/about">{t('nav.about')}</Link></li><li><Link to="/help">{t('nav.help')}</Link></li><li><Link to="/contact">{t('nav.contact')}</Link></li><li><Link to="/privacy">{t('nav.privacy')}</Link></li><li><Link to="/terms">{t('nav.terms')}</Link></li></ul></div>
        <div><h4>{t('footer.contact')}</h4><p className="small">support@example.org <span className="muted">({t('footer.placeholder')})</span><br />+91 00000 00000 <span className="muted">({t('footer.placeholder')})</span><br />Karnataka, India</p><h4>{t('footer.languages')}</h4><p className="small">English · ಕನ್ನಡ · हिन्दी · ತುಳು</p></div>
      </div>
      <div className="container"><p className="small" style={{ borderTop: '1px solid #2a5a3c', paddingTop: 16, marginTop: 24 }}>⚠️ {t('footer.disclaimer')}</p></div>
    </footer>
  );
}

export function Layout() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return (
    <>
      <Navbar />
      <main id="main" tabIndex={-1}><ErrorBoundary key={pathname}><Outlet /></ErrorBoundary></main>
      <Footer />
      <BottomNav />
      <Toasts />
    </>
  );
}
