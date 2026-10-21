import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { ResponsiveContainer } from 'recharts';
import { useFetch } from '../api/client.js';
import { Badge, Card } from './ui/Primitives.jsx';
import { Skeleton } from './ui/Feedback.jsx';
import { useNames } from '../utils/hooks.js';

export const CHART_COLORS = ['#176B3A', '#F97316', '#FFC857', '#2E8B45', '#E94B35', '#83C653', '#8A4B2A', '#4A7FB5'];

/** Accessible chart wrapper: titled figure + hidden data table for screen readers. */
export function ChartCard({ title, subtitle, data, children, unit = '', empty, height = 260, badge }) {
  const { t } = useTranslation();
  const id = useId();
  const hasData = data && data.length > 0 && data.some((d) => (d.value ?? 1) !== 0 || d.value === undefined);
  return (
    <Card pad>
      <figure style={{ margin: 0 }} aria-labelledby={id}>
        <div className="row between"><h3 id={id} style={{ margin: 0 }}>{title}</h3>{badge}</div>
        {subtitle && <p className="muted small" style={{ margin: '2px 0 8px' }}>{subtitle}</p>}
        {hasData ? (
          <>
            <div style={{ width: '100%', height }} role="img" aria-label={`${title}. ${data.slice(0, 12).map((d) => `${d.label ?? d.key}: ${d.value}${unit}`).join(', ')}`}>
              <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer>
            </div>
            <table className="sr-only"><caption>{title}</caption><tbody>{data.map((d, i) => <tr key={i}><th>{d.label ?? d.key}</th><td>{d.value}{unit}</td></tr>)}</tbody></table>
          </>
        ) : <p className="empty muted">{empty || t('common.noData')}</p>}
      </figure>
    </Card>
  );
}

export function DemoDataBanner({ label }) {
  const { t } = useTranslation();
  return <div className="notice" role="note">⚠️ <strong>{label || t('prices.demoLabel')}</strong> — {t('prices.demoNote')}</div>;
}

export function WeatherWidget({ district }) {
  const { t } = useTranslation();
  const { district: dn } = useNames();
  const { data, loading } = useFetch(`/weather?district=${district || ''}`);
  if (loading) return <Card pad><Skeleton h={90} /></Card>;
  if (!data) return null;
  const s = data.sample;
  return (
    <Card pad>
      <div className="row between"><h3 style={{ margin: 0 }}>🌤️ {t('weather.title')} · {dn(data.district)}</h3><Badge color="yellow">{t('weather.sampleLabel')}</Badge></div>
      <p className="muted small" style={{ margin: '4px 0 10px' }}>{t('weather.note')}</p>
      <div className="row" style={{ gap: 20 }}>
        <div><b style={{ fontSize: '2rem', fontFamily: 'var(--font-head)' }}>{s.tempC}°C</b><div className="small muted">{t('weather.humidity')} {s.humidity}%</div></div>
        <div className="row small" style={{ gap: 10 }}>{s.forecast.map((f) => <div key={f.day} className="center"><div className="muted">{f.day}</div><div>{f.hiC}°/{f.loC}°</div></div>)}</div>
      </div>
    </Card>
  );
}
