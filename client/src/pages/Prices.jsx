import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ReferenceLine, Tooltip as RTooltip, XAxis, YAxis } from 'recharts';
import { Badge, Breadcrumbs, Button, Card, Field } from '../components/ui/Primitives.jsx';
import { ErrorState, Skeleton } from '../components/ui/Feedback.jsx';
import { ChartCard, CHART_COLORS, DemoDataBanner } from '../components/Widgets.jsx';
import { useFetch } from '../api/client.js';
import { useNames, usePageTitle } from '../utils/hooks.js';
import { downloadCsv } from '../utils/csv.js';
import { cropByKey } from '@shared/crops.js';
import { fmtDateTime, inr } from '../utils/format.js';

function aggregate(rows, view) {
  if (view === 'daily') return rows;
  const groups = new Map();
  rows.forEach((r, i) => {
    const key = view === 'monthly' ? r.date.slice(0, 7) : `W${Math.floor((rows.length - 1 - i) / 7)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  });
  return [...groups.values()].reverse().map((g) => {
    const out = { date: g[0].date };
    Object.keys(g[0]).filter((k) => k !== 'date').forEach((k) => { out[k] = Math.round((g.reduce((s, x) => s + x[k], 0) / g.length) * 10) / 10; });
    return out;
  });
}

export default function Prices() {
  const { t, lang, crop, unit, district } = useNames();
  usePageTitle(t('nav.prices'));
  const [sp] = useSearchParams();
  const [key, setKey] = useState(sp.get('crop') || 'tomato');
  const [market, setMarket] = useState('all');
  const [view, setView] = useState('daily');
  const [days, setDays] = useState(60);
  const summary = useFetch('/prices/summary');
  const detail = useFetch(`/prices/${key}`);
  const d = detail.data;
  const marketName = (k) => d?.markets.find((m) => m.key === k)?.name || k;

  const rows = useMemo(() => {
    if (!d) return [];
    const mk = market === 'all' ? Object.keys(d.series) : [market];
    const base = d.series[mk[0]].slice(-days);
    const raw = base.map(([date], i) => ({ date, ...Object.fromEntries(mk.map((m) => [m, d.series[m].slice(-days)[i][1]])) }));
    return aggregate(raw, view);
  }, [d, market, view, days]);
  const mkeys = d ? (market === 'all' ? Object.keys(d.series) : [market]) : [];
  const stats = useMemo(() => {
    let hi = null, lo = null;
    rows.forEach((r) => mkeys.forEach((m) => { const v = r[m]; if (!hi || v > hi.v) hi = { v, date: r.date, m }; if (!lo || v < lo.v) lo = { v, date: r.date, m }; }));
    return { hi, lo };
  }, [rows, mkeys.join()]); // eslint-disable-line react-hooks/exhaustive-deps
  const latest = d ? Object.entries(d.series).map(([m, s]) => ({ key: m, label: marketName(m).split(' — ')[0], value: s.at(-1)[1] })) : [];
  const avgRef = latest.length ? latest.reduce((s, x) => s + x.value, 0) / latest.length : 0;
  const asks = (d?.asks || []).filter((a) => (['piece', 'dozen'].includes(a.priceUnit) ? 'piece' : 'kg') === d.unit).map((a) => ({ key: a.seller, label: `${a.seller}`, value: a.basePrice }));
  const meta = d?.meta || summary.data?.meta;

  const exportCsv = () => downloadCsv(`prices-${key}-${view}.csv`, rows.flatMap((r) => mkeys.map((m) => ({ crop: key, market: marketName(m), date: r.date, price: r[m], unit: `INR/${d.unit}`, data_label: meta.label }))), ['crop', 'market', 'date', 'price', 'unit', 'data_label']);
  const factors = ['season', 'quality', 'supply', 'demand', 'transport', 'festival'];

  return (
    <div className="container" style={{ paddingBottom: 24 }}>
      <Breadcrumbs items={[{ label: t('nav.prices') }]} />
      <h1 style={{ fontSize: 'clamp(1.6rem,4vw,2.4rem)' }}>📈 {t('prices.title')}</h1>
      <DemoDataBanner label={meta?.label} />
      {summary.error && <ErrorState error={summary.error} onRetry={summary.reload} />}
      <h2 style={{ marginTop: 20, fontSize: '1.2rem' }}>{t('prices.cards')}</h2>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(min(100%,160px),1fr))' }}>
        {summary.loading ? Array.from({ length: 8 }, (_, i) => <Skeleton key={i} h={86} />) : summary.data.items.map((p) => (
          <button key={p.key} onClick={() => setKey(p.key)} aria-pressed={key === p.key} className="card pad" style={{ textAlign: 'left', cursor: 'pointer', borderColor: key === p.key ? 'var(--orange)' : undefined, borderWidth: key === p.key ? 2 : 1 }}>
            <div>{cropByKey(p.key)?.emoji} <strong>{crop(p.key)}</strong></div>
            <div className="price" style={{ fontSize: '1.15rem' }}>{inr(p.price, lang, 1)}<small>/{unit(p.unit)}</small></div>
            <span className={p.change7d >= 0 ? 'up small' : 'down small'}>{p.change7d >= 0 ? '▲' : '▼'} {Math.abs(p.change7d)}% · 7d</span>
          </button>
        ))}
      </div>

      <Card pad style={{ marginTop: 18 }}>
        <div className="grid g4">
          <Field label={t('prices.crop')}><select className="select" value={key} onChange={(e) => setKey(e.target.value)}>{(summary.data?.items || []).map((p) => <option key={p.key} value={p.key}>{crop(p.key)}</option>)}</select></Field>
          <Field label={t('prices.market')}><select className="select" value={market} onChange={(e) => setMarket(e.target.value)}><option value="all">{t('prices.allMarkets')}</option>{(d?.markets || []).map((m) => <option key={m.key} value={m.key}>{m.name}</option>)}</select></Field>
          <Field label={t('prices.view')}><select className="select" value={view} onChange={(e) => setView(e.target.value)}>{['daily', 'weekly', 'monthly'].map((v) => <option key={v} value={v}>{t(`prices.${v}`)}</option>)}</select></Field>
          <Field label={t('prices.range')}><select className="select" value={days} onChange={(e) => setDays(Number(e.target.value))}>{[14, 30, 60, 90].map((n) => <option key={n} value={n}>{t('prices.lastDays', { n })}</option>)}</select></Field>
        </div>
      </Card>

      {detail.error ? <ErrorState error={detail.error} onRetry={detail.reload} /> : !d ? <Skeleton h={300} style={{ marginTop: 16 }} /> : (
        <div className="stack" style={{ marginTop: 16 }}>
          <div className="grid g3">
            <Card className="kpi o" pad><span className="muted small">{t('prices.highest')}</span><b>{stats.hi && inr(stats.hi.v, lang, 1)}</b><span className="small muted">{stats.hi?.date} · {marketName(stats.hi?.m).split(' — ')[0]}</span></Card>
            <Card className="kpi" pad><span className="muted small">{t('prices.lowest')}</span><b>{stats.lo && inr(stats.lo.v, lang, 1)}</b><span className="small muted">{stats.lo?.date} · {marketName(stats.lo?.m).split(' — ')[0]}</span></Card>
            {d.suggested && <Card className="kpi y" pad><span className="muted small">{t('prices.suggested')}</span><b>{inr(d.suggested.low, lang, 1)}–{inr(d.suggested.high, lang, 1)}</b><span className="small muted">/{unit(d.suggested.unit)} · {t('prices.sampleOnly')}</span></Card>}
          </div>
          <ChartCard title={`${crop(key)} — ${t('prices.trend')} (₹/${unit(d.unit)})`} subtitle={`${t(`prices.${view}`)} · ${meta.label}`} data={rows.map((r) => ({ label: r.date, value: r[mkeys[0]] }))} height={300} badge={<Badge color="yellow">{t('prices.demoShort')}</Badge>}>
            <LineChart data={rows} margin={{ left: -10, right: 8, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--muted)' }} minTickGap={24} /><YAxis tick={{ fontSize: 11, fill: 'var(--muted)' }} domain={['auto', 'auto']} />
              <RTooltip formatter={(v, n) => [`₹${v}/${d.unit}`, marketName(n).split(' — ')[0]]} /><Legend formatter={(n) => marketName(n).split(' — ')[0]} />
              {mkeys.map((m, i) => <Line key={m} type="monotone" dataKey={m} stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2.2} dot={false} />)}
            </LineChart>
          </ChartCard>
          <div className="grid g2">
            <ChartCard title={t('prices.marketCompare')} subtitle={t('prices.latestSample')} data={latest} height={240}>
              <BarChart data={latest} margin={{ left: -10 }}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--muted)' }} /><YAxis tick={{ fontSize: 11, fill: 'var(--muted)' }} /><RTooltip formatter={(v) => `₹${v}/${d.unit}`} /><Bar dataKey="value" fill="#2E8B45" radius={[6, 6, 0, 0]} /></BarChart>
            </ChartCard>
            <ChartCard title={t('prices.askCompare')} subtitle={t('prices.askNote')} data={asks} empty={t('prices.noAsks')} height={240}>
              <BarChart data={asks} margin={{ left: -10 }}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--muted)' }} /><YAxis tick={{ fontSize: 11, fill: 'var(--muted)' }} /><RTooltip formatter={(v) => `₹${v}/${d.unit}`} /><ReferenceLine y={avgRef} stroke="#F97316" strokeDasharray="5 4" label={{ value: t('prices.refAvg'), fontSize: 11, fill: '#F97316', position: 'insideTopRight' }} /><Bar dataKey="value" fill="#FFC857" radius={[6, 6, 0, 0]} /></BarChart>
            </ChartCard>
          </div>
          <div className="grid g2">
            <Card pad><h3>{t('prices.supplyDemand')}</h3>
              <p>{t('prices.sd_listings')}: <strong>{d.supplyDemand.activeListings}</strong><br />{t('prices.sd_qty')}: <strong>{Math.round(d.supplyDemand.availableKg)} kg</strong><br />{t('prices.sd_offers')}: <strong>{d.supplyDemand.openOffers}</strong></p>
              <p className="muted small">{t('prices.sd_note')}</p></Card>
            <Card pad><h3>{t('prices.factors')}</h3><ul style={{ margin: 0, paddingLeft: 18 }}>{factors.map((f) => <li key={f}><strong>{t(`prices.f_${f}`)}</strong> — {t(`prices.f_${f}_d`)}</li>)}</ul></Card>
          </div>
          <Card pad>
            <div className="row between"><div><h3 style={{ margin: 0 }}>{t('prices.sourceTitle')}</h3>
              <p className="small muted" style={{ margin: '6px 0 0' }}>{t('prices.source')}: {meta.source}<br />{t('prices.units')}: ₹/{unit(d.unit)} · {t('prices.updated')}: {fmtDateTime(meta.updatedAt, lang)} · {t('prices.provider')}: <code>{meta.provider}</code></p></div>
              <Button variant="outline" onClick={exportCsv}>⬇ {t('common.exportCsv')}</Button></div>
            {d.suggested && <p className="small muted" style={{ marginBottom: 0 }}>{d.suggested.basis}</p>}
          </Card>
          <p className="center"><Button as={Link} to="/assistant" variant="outline">🤖 {t('prices.askAssistant')}</Button></p>
        </div>
      )}
    </div>
  );
}
