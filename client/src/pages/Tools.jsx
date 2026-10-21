import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, Tooltip as RTooltip, XAxis, YAxis } from 'recharts';
import { Badge, Button, Breadcrumbs, Card, Field, Tabs } from '../components/ui/Primitives.jsx';
import { EmptyState, ErrorState, Skeleton } from '../components/ui/Feedback.jsx';
import { ChartCard, CHART_COLORS, WeatherWidget } from '../components/Widgets.jsx';
import { SwitchIdentityNote } from '../components/Dialogs.jsx';
import { api, useFetch } from '../api/client.js';
import { useApp } from '../context/AppContext.jsx';
import { useNames, usePageTitle } from '../utils/hooks.js';
import { downloadCsv } from '../utils/csv.js';
import { inr, fmtDateTime } from '../utils/format.js';
import { CATEGORIES, CROPS } from '@shared/crops.js';
import { DISTRICTS, districtDistanceKm, transportEstimate } from '@shared/geo.js';

export function Markets() {
  const { t, lang, district, crop } = useNames();
  usePageTitle(t('nav.markets'));
  const { user, meta } = useApp();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('mysuru');
  const f = from || user?.district || 'bengaluru_rural';
  const { data, loading, error, reload } = useFetch(`/markets?from=${f}`, [user?.id]);
  const km = districtDistanceKm(f, to);
  const est = km != null ? transportEstimate(km, meta?.transportAssumptions) : null;
  return (
    <div className="container" style={{ paddingBottom: 24 }}>
      <Breadcrumbs items={[{ label: t('nav.markets') }]} />
      <h1 style={{ fontSize: 'clamp(1.6rem,4vw,2.3rem)' }}>📍 {t('markets.title')}</h1>
      <div className="notice" role="note">ℹ️ {t('markets.note')}</div>
      <Card pad style={{ margin: '16px 0' }}><h3>🚚 {t('markets.calc')}</h3>
        <div className="grid g3"><Field label={t('markets.from')}><select className="select" value={f} onChange={(e) => setFrom(e.target.value)}>{DISTRICTS.map((d) => <option key={d.key} value={d.key}>{district(d.key)}</option>)}</select></Field>
          <Field label={t('markets.to')}><select className="select" value={to} onChange={(e) => setTo(e.target.value)}>{DISTRICTS.map((d) => <option key={d.key} value={d.key}>{district(d.key)}</option>)}</select></Field>
          <div className="notice info small" aria-live="polite">{est ? <><strong>≈ {inr(est.cost, lang, 0)}</strong><br />{t('order.transportNote', { km: est.straightKm, road: est.approxRoadKm })}</> : '—'}</div></div>
        {est && <p className="muted small" style={{ marginBottom: 0 }}>{t('markets.assump', { rate: est.assumptions.ratePerKm, min: est.assumptions.minCharge, factor: est.assumptions.roadFactor })}</p>}</Card>
      {error ? <ErrorState error={error} onRetry={reload} /> : loading ? <Skeleton h={200} /> : (
        <div className="cards">{data.items.map((m) => (
          <Card key={m.key} pad hover><div className="row between"><h3 style={{ margin: 0 }}>{district(m.key)}</h3><Badge color="gray">{m.distanceKm === 0 ? t('markets.here') : `≈ ${m.distanceKm} km`}</Badge></div>
            <p className="small muted" style={{ margin: '6px 0' }}>{t('markets.listings', { n: m.listings })} · {t('markets.buyers', { n: m.buyers })}</p>
            <p className="small" style={{ minHeight: 40 }}>{m.crops.length ? m.crops.join(', ') : t('markets.noCrops')}</p>
            <Button as={Link} to={`/marketplace?district=${m.key}`} size="sm" variant="outline">{t('markets.filter')}</Button></Card>))}</div>)}
    </div>
  );
}

const RES = ['grading', 'packing', 'photos', 'pricing', 'fpo', 'safety'];
export function Resources() {
  const { t } = useNames();
  usePageTitle(t('nav.resources'));
  const { user } = useApp();
  return (
    <div className="container" style={{ paddingBottom: 24 }}>
      <Breadcrumbs items={[{ label: t('nav.resources') }]} />
      <h1 style={{ fontSize: 'clamp(1.6rem,4vw,2.3rem)' }}>📚 {t('res.title')}</h1><p className="muted">{t('res.sub')}</p>
      <div className="grid g3">{RES.map((k) => <Card key={k} pad hover><h3>{t(`res.${k}`)}</h3><p className="muted" style={{ margin: 0 }}>{t(`res.${k}_d`)}</p></Card>)}</div>
      <div className="grid g2" style={{ marginTop: 18, alignItems: 'start' }}><WeatherWidget district={user?.district} />
        <Card pad><h3>🤖 {t('nav.assistant')}</h3><p className="muted">{t('assistant.sub')}</p><Button as={Link} to="/assistant">{t('assistant.open')}</Button></Card></div>
      <p className="muted small" style={{ marginTop: 16 }}>{t('res.disclaimer')}</p>
    </div>
  );
}

export function Assistant() {
  const { t, district, crop } = useNames();
  usePageTitle(t('nav.assistant'));
  const { user, users, fail } = useApp();
  const [tool, setTool] = useState('description');
  const [p, setP] = useState({ cropName: 'Tomato', grade: 'A', organic: 'conventional', harvestDate: new Date().toISOString().slice(0, 10) });
  const [out, setOut] = useState(null);
  const [busy, setBusy] = useState(false);
  if (user && user.role !== 'farmer') return <div className="container section"><h1>{t('nav.assistant')}</h1><SwitchIdentityNote role="farmer" /></div>;
  const tools = ['description', 'tags', 'priceExplain', 'checklist', 'buyerQuestions', 'trends', 'buyers'];
  const run = async () => {
    if (tool === 'buyers') {
      const key = CROPS.find((c) => p.cropName.toLowerCase().includes(c.en.toLowerCase()))?.key;
      const m = users.filter((u) => u.role === 'buyer' && key && u.prefs?.preferredCrops.includes(key));
      setOut({ source: 'rules', label: t('assistant.rulesLabel'), items: m.map((u) => `${u.name} — ${district(u.district)}`), text: m.length ? '' : t('assistant.noBuyers'), disclaimer: t('assistant.disc') });
      return;
    }
    setBusy(true);
    try { setOut(await api('/assistant', { method: 'POST', body: { tool, params: { ...p, district: p.district || user?.district, village: user?.village } } })); } catch (e) { fail(e); } finally { setBusy(false); }
  };
  return (
    <div className="container" style={{ paddingBottom: 24, maxWidth: 900 }}>
      <Breadcrumbs items={[{ label: t('nav.assistant') }]} />
      <h1 style={{ fontSize: 'clamp(1.6rem,4vw,2.3rem)' }}>🤖 {t('nav.assistant')}</h1>
      <div className="notice" role="note">⚠️ {t('assistant.notice')}</div>
      <div style={{ margin: '16px 0' }}><Tabs label={t('nav.assistant')} value={tool} onChange={(k) => { setTool(k); setOut(null); }} tabs={tools.map((k) => ({ key: k, label: t(`assistant.t_${k}`) }))} /></div>
      <Card pad className="stack">
        {['description', 'tags', 'priceExplain', 'buyers'].includes(tool) && (
          <div className="grid g2">
            <Field label={t('sell.cropName')}><input className="input" value={p.cropName} onChange={(e) => setP({ ...p, cropName: e.target.value })} /></Field>
            {['description', 'tags'].includes(tool) && <Field label={t('sell.grade')}><select className="select" value={p.grade} onChange={(e) => setP({ ...p, grade: e.target.value })}>{['A', 'B', 'C', 'ungraded'].map((g) => <option key={g} value={g}>{t(`grade.${g}`)}</option>)}</select></Field>}
          </div>)}
        <div><Button loading={busy} onClick={run}>{t('assistant.run')}</Button></div>
        {out && (
          <div className="notice info stack" aria-live="polite"><Badge color={out.source === 'ai' ? 'blue' : 'yellow'}>{out.label}</Badge>
            {out.text && <p style={{ margin: 0 }}>{out.text}</p>}
            {out.items && <ul style={{ margin: 0, paddingLeft: 18 }}>{out.items.map((i) => <li key={i}>{i}</li>)}</ul>}
            {out.note && <p className="small">{out.note}</p>}<p className="small muted" style={{ margin: 0 }}>{out.disclaimer}</p></div>)}
      </Card>
    </div>
  );
}

export function Analytics() {
  const { t, cat, district } = useNames();
  usePageTitle(t('nav.analytics'));
  const { user, version } = useApp();
  const [dist, setDist] = useState('');
  const [category, setCategory] = useState('');
  const { data, loading, error, reload } = useFetch(`/analytics?district=${dist}&category=${category}`, [version]);
  const listings = useFetch('/listings?pageSize=48');
  const offers = useFetch('/offers', [user?.id, version]);
  const orders = useFetch('/orders', [user?.id, version]);
  const lab = (arr, fn) => (arr || []).map((x) => ({ ...x, label: fn(x.key) }));
  const bar = (arr, color, h = 230) => (
    <BarChart data={arr} margin={{ left: -15 }}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--muted)' }} interval={0} angle={-25} textAnchor="end" height={55} /><YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--muted)' }} /><RTooltip /><Bar dataKey="value" fill={color} radius={[6, 6, 0, 0]} /></BarChart>
  );
  const pie = (arr) => <PieChart><Pie data={arr} dataKey="value" nameKey="label" outerRadius={80} label={(e) => e.label}>{arr.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % 8]} />)}</Pie><RTooltip /></PieChart>;
  const exp = {
    listings: () => downloadCsv('listings.csv', (listings.data?.items || []).map((l) => ({ id: l.id, crop: l.cropName, category: l.category, district: l.district, price: l.price, price_unit: l.priceUnit, quantity: l.quantity, quantity_unit: l.quantityUnit, grade: l.grade, harvest: l.harvestDate }))),
    offers: () => downloadCsv('offers.csv', (offers.data || []).map((o) => ({ id: o.id, crop: o.listing?.cropName, price: o.price, quantity: o.quantity, status: o.status, created: o.createdAt }))),
    orders: () => downloadCsv('orders.csv', (orders.data || []).map((o) => ({ ref: o.ref, crop: o.cropName, quantity: o.quantity, subtotal_inr: o.subtotal, status: o.status, demo_order: 'yes' }))),
  };
  return (
    <div className="container" style={{ paddingBottom: 24 }}>
      <Breadcrumbs items={[{ label: t('nav.analytics') }]} />
      <div className="row between page-head"><div><h1 style={{ fontSize: 'clamp(1.6rem,4vw,2.3rem)' }}>📊 {t('analytics.title')}</h1><p className="muted">{t('analytics.sub')}</p></div>
        <div className="row"><Button variant="outline" size="sm" onClick={exp.listings}>⬇ {t('analytics.exp_listings')}</Button><Button variant="outline" size="sm" onClick={exp.offers}>⬇ {t('analytics.exp_offers')}</Button><Button variant="outline" size="sm" onClick={exp.orders}>⬇ {t('analytics.exp_orders')}</Button></div></div>
      <Card pad><div className="grid g2"><Field label={t('market.district')}><select className="select" value={dist} onChange={(e) => setDist(e.target.value)}><option value="">{t('common.all')}</option>{DISTRICTS.map((d) => <option key={d.key} value={d.key}>{district(d.key)}</option>)}</select></Field>
        <Field label={t('market.category')}><select className="select" value={category} onChange={(e) => setCategory(e.target.value)}><option value="">{t('common.all')}</option>{CATEGORIES.map((c) => <option key={c.key} value={c.key}>{cat(c.key)}</option>)}</select></Field></div></Card>
      {error ? <ErrorState error={error} onRetry={reload} /> : loading || !data ? <Skeleton h={300} style={{ marginTop: 16 }} /> : (
        <div className="grid g2" style={{ marginTop: 16, alignItems: 'start' }}>
          <ChartCard title={t('analytics.byCategory')} data={lab(data.listingsByCategory, cat)}>{bar(lab(data.listingsByCategory, cat), '#2E8B45')}</ChartCard>
          <ChartCard title={t('analytics.byDistrict')} data={lab(data.listingsByDistrict, district)}>{bar(lab(data.listingsByDistrict, district), '#F97316')}</ChartCard>
          <ChartCard title={t('analytics.priceDist')} subtitle={t('analytics.priceDistNote')} data={data.priceDistribution.map((x) => ({ ...x, label: x.key }))}>{bar(data.priceDistribution.map((x) => ({ ...x, label: x.key })), '#FFC857')}</ChartCard>
          <ChartCard title={t('analytics.qtyByCat')} subtitle={data.note} unit=" kg" data={lab(data.quantityByCategory, cat)}>{bar(lab(data.quantityByCategory, cat), '#176B3A')}</ChartCard>
          <ChartCard title={t('dash.offersByStatus')} data={lab(data.offersByStatus, (k) => t(`status.${k}`))}>{pie(lab(data.offersByStatus, (k) => t(`status.${k}`)))}</ChartCard>
          <ChartCard title={t('dash.ordersByStatus')} subtitle={t('demo.orderWord')} data={lab(data.ordersByStatus, (k) => t(`status.${k}`))}>{pie(lab(data.ordersByStatus, (k) => t(`status.${k}`)))}</ChartCard>
          <ChartCard title={t('analytics.activity')} data={data.activity.map((x) => ({ ...x, label: x.key }))}>
            <LineChart data={data.activity.map((x) => ({ ...x, label: x.key }))} margin={{ left: -15 }}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--muted)' }} /><YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--muted)' }} /><RTooltip /><Line type="monotone" dataKey="value" stroke="#E94B35" strokeWidth={2.5} /></LineChart>
          </ChartCard>
        </div>)}
    </div>
  );
}

export function Demo() {
  const { t, lang } = useNames();
  usePageTitle(t('nav.demoTools'));
  const { users, user, switchUser, confirm, toast, fail, refresh, meta, loadBase } = useApp();
  const [busy, setBusy] = useState(false);
  const reset = async () => {
    if (!(await confirm({ title: t('demo.reset'), body: t('demo.resetConfirm'), danger: true, confirmLabel: t('demo.reset') }))) return;
    setBusy(true);
    try { await api('/demo/reset', { method: 'POST' }); localStorage.removeItem(`kd_prefs_${user.id}`); await loadBase(); refresh(); toast(t('demo.resetDone')); } catch (e) { fail(e); } finally { setBusy(false); }
  };
  const rows = [['prices.provider', meta?.priceMeta?.provider], ['demo.live', String(meta?.priceMeta?.live)], ['demo.ai', meta?.aiConfigured ? 'external AI (server-side)' : 'template-based demo assistant'], ['demo.recommender', meta?.recommender?.type], ['demo.seeded', meta && fmtDateTime(meta.seededAt, lang)]];
  return (
    <div className="container" style={{ paddingBottom: 24, maxWidth: 900 }}>
      <Breadcrumbs items={[{ label: t('nav.demoTools') }]} />
      <h1 style={{ fontSize: 'clamp(1.6rem,4vw,2.3rem)' }}>⚙️ {t('demo.title')}</h1>
      <div className="notice">{t('demo.banner')}</div>
      <Card pad style={{ margin: '16px 0' }}><h3>{t('demo.identity')}</h3><p className="muted small">{t('demo.identityNote')}</p>
        <div className="grid g2">{users.map((u) => <Button key={u.id} variant={u.id === user?.id ? '' : 'outline'} onClick={() => switchUser(u.id)} aria-pressed={u.id === user?.id}>{u.role === 'farmer' ? '🧑‍🌾' : '🛒'} {u.name} · {t(`demo.${u.role}`)}</Button>)}</div></Card>
      <Card pad style={{ marginBottom: 16 }}><h3>{t('demo.reset')}</h3><p className="muted">{t('demo.resetBody')}</p><Button variant="danger" loading={busy} onClick={reset}>↺ {t('demo.reset')}</Button></Card>
      <Card pad><h3>{t('demo.status')}</h3><table className="t"><tbody>{rows.map(([k, v]) => <tr key={k}><th scope="row">{t(k)}</th><td>{v}</td></tr>)}</tbody></table>
        <h3 style={{ marginTop: 16 }}>{t('demo.limits')}</h3><ul>{['l1', 'l2', 'l3', 'l4', 'l5'].map((k) => <li key={k}>{t(`demo.${k}`)}</li>)}</ul></Card>
    </div>
  );
}
