import { Component } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../../context/AppContext.jsx';
import { Button } from './Primitives.jsx';

export const Skeleton = ({ h = 20, w = '100%', style }) => <div className="skeleton" style={{ height: h, width: w, ...style }} aria-hidden="true" />;
export const CardSkeletons = ({ n = 6 }) => (
  <div className="cards" aria-busy="true" aria-label="Loading">
    {Array.from({ length: n }, (_, i) => <div key={i} className="card"><Skeleton h={170} style={{ borderRadius: 0 }} /><div style={{ padding: 14, display: 'grid', gap: 10 }}><Skeleton h={18} w="70%" /><Skeleton h={14} w="45%" /><Skeleton h={36} /></div></div>)}
  </div>
);

export function EmptyState({ emoji = '🌱', title, children, action }) {
  return <div className="empty card pad"><span className="em" aria-hidden="true">{emoji}</span><h3>{title}</h3>{children && <p>{children}</p>}{action}</div>;
}

export function ErrorState({ error, onRetry }) {
  const { t } = useTranslation();
  return (
    <div className="notice error" role="alert" style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
      <span style={{ flex: 1 }}>⚠️ {t(`err.${error?.code || 'serverError'}`, { defaultValue: t('err.serverError') })}</span>
      {onRetry && <Button size="sm" variant="outline" onClick={onRetry}>{t('common.retry')}</Button>}
    </div>
  );
}

export function Toasts() {
  const { toasts, dismissToast } = useApp();
  const { t } = useTranslation();
  return (
    <div className="toasts" aria-live="polite" aria-atomic="false">
      {toasts.map((x) => (
        <div key={x.id} className={`toast ${x.type}`} role={x.type === 'error' ? 'alert' : 'status'}>
          <span style={{ flex: 1 }}>{x.type === 'error' ? '⚠️ ' : x.type === 'success' ? '✅ ' : 'ℹ️ '}{x.message}</span>
          <button className="btn ghost sm" style={{ color: '#fff', minHeight: 24, padding: '0 6px' }} onClick={() => dismissToast(x.id)} aria-label={t('common.close')}>✕</button>
        </div>
      ))}
    </div>
  );
}

class Boundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(e) { console.error(e); }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="container section"><div className="card pad center">
        <h2>🌾 {this.props.t('err.boundaryTitle')}</h2><p className="muted">{this.props.t('err.boundaryBody')}</p>
        <Button onClick={() => { this.setState({ error: null }); window.location.assign('/'); }}>{this.props.t('nav.home')}</Button>
      </div></div>
    );
  }
}
export function ErrorBoundary({ children }) {
  const { t } = useTranslation();
  return <Boundary t={t}>{children}</Boundary>;
}
