import { useEffect, useState } from 'react';
import { useListingsByIds } from '../utils/useListings.js';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, Tooltip as RTooltip, XAxis, YAxis } from 'recharts';
import { Badge, Button, Breadcrumbs, Card, Field, StatusBadge } from '../components/ui/Primitives.jsx';
import { CardSkeletons, EmptyState, ErrorState, Skeleton } from '../components/ui/Feedback.jsx';
import { ChartCard, CHART_COLORS, WeatherWidget } from '../components/Widgets.jsx';
import { SwitchIdentityNote } from '../components/Dialogs.jsx';
import { ListingCard } from '../components/ListingCard.jsx';
import { api, useFetch } from '../api/client.js';
import { useApp } from '../context/AppContext.jsx';
import { useNames, usePageTitle } from '../utils/hooks.js';
import { ago, fmtDate, inr, num } from '../utils/format.js';
import { CROPS } from '@shared/crops.js';
import { DISTRICTS } from '@shared/geo.js';

const Kpi = ({ label, value, cls = '', sub }) => <Card className={`kpi ${cls}`}><span className="muted small">{label}</span><b>{value}</b>{sub && <span className="small muted">{sub}</span>}</Card>;
const toChart = (obj, t) => Object.entries(obj || {}).map(([key, value]) => ({ key, label: t(`status.${key}`), value }));

export function FarmerDashboard() {
  const { t, lang, unit } = useNames();
  usePageTitle(t('dash.farmerTitle'));
  const { user, version, toast, fail, refresh, confirm } = useApp();
  const stats = useFetch(user?.role === 'farmer' ? '/dashboard/farmer' : null, [version, user?.id]);
  const mine = useFetch(user?.role === 'farmer' ? `/listings?sellerId=${user.id}&pageSize=48` : null, [version, user?.id]);
  const notifs = useFetch(user?.role === 'farmer' ? '/notifications' : null, [version, user?.id]);
  if (user && user.role !== 'farmer') return <div className="container section"><h1>{t('dash.farmerTitle')}</h1><SwitchIdentityNote role="farmer" /></div>;
  const s = stats.data;
  const setStatus = async (l, status) => { try { await api(`/listings/${l.id}/status`, { method: 'PATCH', body: { status } }); toast(t('sell.statusChanged')); refresh(); } catch (e) { fail(e); } };
  const del = async (l) => { if (!(await confirm({ title: t('sell.deleteTitle'), body: t('sell.deleteBody'), danger: true, confirmLabel: t('common.delete') }))) return; try { await api(`/listings/${l.id}`, { method: 'DELETE' }); toast(t('sell.deleted')); refresh(); } catch (e) { fail(e); } };
  return (
    <div className="container" style={{ paddingBottom: 24 }}>
      <Breadcrumbs items={[{ label: t('nav.farmers') }]} />
      <div className="row between page-head"><div><h1 style={{ fontSize: 'clamp(1.6rem,4vw,2.3rem)' }}>🧑‍🌾 {t('dash.farmerTitle')}</h1><p className="muted">{user?.name} · <Badge color="yellow">{t('demo.farmer')}</Badge></p></div>
        <div className="row"><Button as={Link} to="/sell">＋ {t('dash.addCrop')}</Button><Button as={Link} to="/assistant" variant="outline">🤖 {t('nav.assistant')}</Button></div></div>
      <div className="notice info small" style={{ marginBottom: 14 }}>ℹ️ {t('dash.sampleNote')}</div>
      {stats.error ? <ErrorState error={stats.error} onRetry={stats.reload} /> : !s ? <Skeleton h={120} /> : (
        <>
          <div className="grid g4">
            <Kpi label={t('dash.activeListings')} value={s.activeListings} sub={`/ ${s.totalListings}`} />
            <Kpi label={t('dash.available')} value={`${num(s.availableKg, lang, 0)} kg`} sub={s.availablePieces ? `+ ${num(s.availablePieces, lang, 0)} ${t('unit.piece')}` : undefined} cls="y" />
            <Kpi label={t('dash.enquiries')} value={s.enquiries} sub={s.unreadEnquiries ? t('dash.unread', { n: s.unreadEnquiries }) : undefined} cls="o" />
            <Kpi label={t('dash.pendingOffers')} value={s.pendingOffers} cls="o" />
            <Kpi label={t('dash.acceptedOffers')} value={s.acceptedOffers} />
            <Kpi label={t('dash.orders')} value={s.orders} cls="r" sub={t('demo.orderWord')} />
          </div>
          <div className="grid g2" style={{ marginTop: 16 }}>
            <ChartCard title={t('dash.offersByStatus')} data={toChart(s.offersByStatus, t)} height={220}>
              <PieChart><Pie data={toChart(s.offersByStatus, t)} dataKey="value" nameKey="label" outerRadius={80} label={(e) => e.label}>{toChart(s.offersByStatus, t).map((_, i) => <Cell key={i} fill={CHART_COLORS[i % 8]} />)}</Pie><RTooltip /></PieChart>
            </ChartCard>
            <ChartCard title={t('dash.ordersByStatus')} data={toChart(s.ordersByStatus, t)} height={220}>
              <BarChart data={toChart(s.ordersByStatus, t)} margin={{ left: -20 }}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--muted)' }} /><YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--muted)' }} /><RTooltip /><Bar dataKey="value" fill="#F97316" radius={[6, 6, 0, 0]} /></BarChart>
            </ChartCard>
          </div>
        </>
      )}
      <section className="section" style={{ paddingBottom: 0 }}>
        <h2>{t('dash.myListings')}</h2>
        {mine.loading || !mine.data ? <Skeleton h={160} /> : mine.data.items.length === 0 ? <EmptyState emoji="🌱" title={t('dash.noListings')} action={<Button as={Link} to="/sell">＋ {t('dash.addCrop')}</Button>}>{t('dash.noListingsBody')}</EmptyState> : (
          <div className="table-wrap"><table className="t">
            <thead><tr><th>{t('listing.crop')}</th><th>{t('listing.price')}</th><th>{t('listing.available')}</th><th>{t('dash.views')}</th><th>{t('dash.offers')}</th><th>{t('dash.status')}</th><th>{t('dash.actions')}</th></tr></thead>
            <tbody>{mine.data.items.map((l) => (
              <tr key={l.id}>
                <td><Link to={`/crop/${l.id}`}>{l.cropName}</Link></td><td>{inr(l.price, lang)}/{unit(l.priceUnit)}</td><td>{num(l.quantity, lang)} {unit(l.quantityUnit)}</td><td>{l.views}</td><td>{l.offerCount}</td><td><StatusBadge status={l.status} /></td>
                <td><div className="row" style={{ gap: 6 }}>
                  <Button size="sm" variant="outline" as={Link} to={`/sell/${l.id}/edit`}>{t('common.edit')}</Button>
                  {l.status === 'active' && <Button size="sm" variant="ghost" onClick={() => setStatus(l, 'paused')}>⏸</Button>}
                  {['paused', 'draft', 'sold'].includes(l.status) && <Button size="sm" variant="ghost" onClick={() => setStatus(l, 'active')}>{l.status === 'draft' ? t('sell.publish') : '▶'}</Button>}
                  {['active', 'paused'].includes(l.status) && <Button size="sm" variant="ghost" onClick={() => setStatus(l, 'sold')}>✔ {t('sell.markSold')}</Button>}
                  <Button size="sm" variant="ghost" as={Link} to={`/prices?crop=${l.cropKey}`}>📈</Button>
                  <Button size="sm" variant="ghost" onClick={() => del(l)} aria-label={t('common.delete')}>🗑</Button>
                </div></td>
              </tr>))}</tbody>
          </table></div>
        )}
      </section>
      {s && (
        <div className="grid g3" style={{ marginTop: 24, alignItems: 'start' }}>
          <Card pad><h3>{t('dash.recentOffers')}</h3>{s.recentOffers.length === 0 ? <p className="muted">{t('offer.none')}</p> : s.recentOffers.map((o) => <p key={o.id} className="small" style={{ margin: '6px 0' }}><StatusBadge status={o.status} /> {o.buyerName} — {o.listing?.cropName} · ₹{o.price} <span className="muted">· {ago(o.updatedAt, t)}</span></p>)}<Link to="/offers">{t('common.viewAll')} →</Link></Card>
          <Card pad><h3>{t('dash.recentListings')}</h3>{s.recentListings.map((l) => <p key={l.id} className="small" style={{ margin: '6px 0' }}><StatusBadge status={l.status} /> <Link to={`/crop/${l.id}`}>{l.cropName}</Link> <span className="muted">· {ago(l.updatedAt, t)}</span></p>)}</Card>
          <Card pad><h3>{t('dash.best')}</h3>{s.best.length === 0 ? <p className="muted small">{t('dash.bestNeed')}</p> : s.best.map((b) => <p key={b.id} className="small" style={{ margin: '6px 0' }}>🏆 {b.cropName} — {b.views} {t('dash.views')}, {b.offers} {t('dash.offers')}</p>)}</Card>
          <Card pad><h3>🔔 {t('nav.notifications')}</h3>{(notifs.data || []).slice(0, 4).map((n) => <p key={n.id} className="small" style={{ margin: '6px 0', fontWeight: n.read ? 400 : 700 }}>{t(`notif.${n.type}`, n.data)}</p>)}{notifs.data?.length === 0 && <p className="muted small">{t('notif.empty')}</p>}<Link to="/notifications">{t('common.viewAll')} →</Link></Card>
          <WeatherWidget district={user?.district} />
        </div>
      )}
    </div>
  );
}

export function BuyerDashboard() {
  const { t, lang, district, crop, unit } = useNames();
  usePageTitle(t('dash.buyerTitle'));
  const { user, version, prefs, toast, fail, refresh, clearSearches, loadBase } = useApp();
  const stats = useFetch(user?.role === 'buyer' ? '/dashboard/buyer' : null, [version, user?.id]);
  const saved = useListingsByIds(prefs.wishlist.slice(0, 4));
  const [c, setC] = useState({ crops: [], districts: [], quantity: '', quantityUnit: 'kg', budget: '', fulfilment: '' });
  const [rec, setRec] = useState(null);
  const [recBusy, setRecBusy] = useState(false);
  useEffect(() => { if (user?.prefs) setC((x) => ({ ...x, crops: user.prefs.preferredCrops, districts: user.prefs.preferredDistricts })); }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (user && user.role !== 'buyer') return <div className="container section"><h1>{t('dash.buyerTitle')}</h1><SwitchIdentityNote role="buyer" /></div>;
  const s = stats.data;
  const toggle = (k, v) => setC((x) => ({ ...x, [k]: x[k].includes(v) ? x[k].filter((y) => y !== v) : [...x[k], v] }));
  const savePrefs = async () => { try { await api('/me/prefs', { method: 'PUT', body: { preferredCrops: c.crops, preferredDistricts: c.districts } }); toast(t('dash.prefsSaved')); loadBase(); refresh(); } catch (e) { fail(e); } };
  const run = async () => { setRecBusy(true); try { setRec(await api('/recommendations', { method: 'POST', body: c })); } catch (e) { fail(e); } finally { setRecBusy(false); } };
  return (
    <div className="container" style={{ paddingBottom: 24 }}>
      <Breadcrumbs items={[{ label: t('nav.buyers') }]} />
      <div className="row between page-head"><div><h1 style={{ fontSize: 'clamp(1.6rem,4vw,2.3rem)' }}>🛒 {t('dash.buyerTitle')}</h1><p className="muted">{user?.name} · <Badge color="yellow">{t('demo.buyer')}</Badge></p></div>
        <div className="row"><Button as={Link} to="/marketplace">{t('hero.browse')}</Button><Button as={Link} to="/compare" variant="outline">⇄ {t('nav.compare')} ({prefs.compare.length})</Button></div></div>
      {stats.error ? <ErrorState error={stats.error} onRetry={stats.reload} /> : !s ? <Skeleton h={110} /> : (
        <div className="grid g4">
          <Kpi label={t('dash.sentOffers')} value={s.sentOffers} sub={t('dash.pendingN', { n: s.pendingOffers })} /><Kpi label={t('dash.counters')} value={s.counters} cls="o" />
          <Kpi label={t('dash.orders')} value={s.orders} cls="r" sub={t('demo.orderWord')} /><Kpi label={t('dash.enquiries')} value={s.enquiries} cls="y" />
        </div>
      )}
      <div className="grid g2" style={{ marginTop: 18, alignItems: 'start' }}>
        <Card pad className="stack">
          <h3>🎯 {t('rec.title')}</h3>
          <p className="muted small" style={{ margin: 0 }}>{t('rec.explain')}</p>
          <div><span className="label">{t('dash.prefCrops')}</span><div className="chips" style={{ marginTop: 6 }}>{CROPS.slice(0, 16).map((k) => <button key={k.key} className={`chip ${c.crops.includes(k.key) ? 'on' : ''}`} aria-pressed={c.crops.includes(k.key)} onClick={() => toggle('crops', k.key)}>{k.emoji} {crop(k.key)}</button>)}</div></div>
          <div><span className="label">{t('dash.prefDistricts')}</span><div className="chips" style={{ marginTop: 6 }}>{DISTRICTS.map((d) => <button key={d.key} className={`chip ${c.districts.includes(d.key) ? 'on' : ''}`} aria-pressed={c.districts.includes(d.key)} onClick={() => toggle('districts', d.key)}>{district(d.key)}</button>)}</div></div>
          <div className="grid g3" style={{ gap: 10 }}>
            <Field label={t('rec.quantity')}><div className="row" style={{ flexWrap: 'nowrap' }}><input className="input" type="number" min="0" value={c.quantity} onChange={(e) => setC({ ...c, quantity: e.target.value })} /><select className="select" style={{ width: 96 }} aria-label={t('sell.quantityUnit')} value={c.quantityUnit} onChange={(e) => setC({ ...c, quantityUnit: e.target.value })}>{['kg', 'quintal', 'tonne', 'piece', 'dozen'].map((u) => <option key={u} value={u}>{unit(u)}</option>)}</select></div></Field>
            <Field label={t('rec.budget')}><input className="input" type="number" min="0" value={c.budget} onChange={(e) => setC({ ...c, budget: e.target.value })} /></Field>
            <Field label={t('market.fulfilment')}><select className="select" value={c.fulfilment} onChange={(e) => setC({ ...c, fulfilment: e.target.value })}><option value="">{t('common.all')}</option><option value="pickup">{t('fulfil.pickup')}</option><option value="delivery">{t('fulfil.delivery')}</option></select></Field>
          </div>
          <div className="row"><Button loading={recBusy} onClick={run}>{t('rec.run')}</Button><Button variant="outline" onClick={savePrefs}>{t('dash.savePrefs')}</Button></div>
        </Card>
        <div className="stack">
          {rec && (rec.items.length === 0 ? <EmptyState emoji="🔎" title={t('rec.none')} /> : (
            <Card pad><h3>{t('rec.results')}</h3><p className="small muted">{t('rec.method')}</p>
              {rec.items.slice(0, 5).map((r) => (
                <div key={r.listing.id} style={{ borderTop: '1px solid var(--border)', padding: '10px 0' }}>
                  <div className="row between"><Link to={`/crop/${r.listing.id}`}><strong>{r.listing.cropName}</strong></Link><Badge color="green">{t('rec.score')} {r.score}</Badge></div>
                  <div className="small muted">{r.listing.seller.name} · {district(r.listing.district)} · {inr(r.listing.price, lang)}/{unit(r.listing.priceUnit)}</div>
                  <ul className="small" style={{ margin: '4px 0 0', paddingLeft: 18 }}>{r.reasons.map((x) => <li key={x}>✅ {t(`rec.r_${x}`)}</li>)}{r.miss.map((x) => <li key={x} className="muted">➖ {t(`rec.m_${x}`)}</li>)}</ul>
                </div>))}
            </Card>))}
          <Card pad><h3>🔖 {t('dash.saved')}</h3>{saved.loading ? <Skeleton h={50} /> : saved.items.length === 0 ? <p className="muted small">{t('wish.empty')}</p> : saved.items.map((l) => <p key={l.id} className="small" style={{ margin: '6px 0' }}><Link to={`/crop/${l.id}`}>{l.cropName}</Link> — {inr(l.price, lang)}/{unit(l.priceUnit)}</p>)}<Link to="/wishlist">{t('common.viewAll')} →</Link></Card>
          <Card pad><div className="row between"><h3 style={{ margin: 0 }}>🕘 {t('dash.recentSearches')}</h3>{prefs.searches.length > 0 && <Button size="sm" variant="ghost" onClick={clearSearches}>{t('common.clear')}</Button>}</div>
            {prefs.searches.length === 0 ? <p className="muted small">{t('dash.noSearches')}</p> : <div className="chips" style={{ marginTop: 8 }}>{prefs.searches.map((q) => <Link key={q} className="chip" to={`/marketplace?q=${encodeURIComponent(q)}`}>{q}</Link>)}</div>}</Card>
        </div>
      </div>
      {s && (
        <div className="grid g2" style={{ marginTop: 18, alignItems: 'start' }}>
          <Card pad><h3>📦 {t('dash.tracking')}</h3>{s.openOrders.length === 0 ? <p className="muted">{t('order.none')}</p> : s.openOrders.map((o) => <p key={o.id} className="small" style={{ margin: '8px 0' }}><StatusBadge status={o.status} /> <strong>{o.ref}</strong> — {o.cropName} · {inr(o.subtotal, lang)}</p>)}<Link to="/orders">{t('common.viewAll')} →</Link></Card>
          <Card pad><h3>🕒 {t('dash.activity')}</h3>{s.activity.length === 0 ? <p className="muted">{t('dash.noActivity')}</p> : s.activity.map((a) => <p key={a.kind + a.id} className="small" style={{ margin: '6px 0' }}>{a.kind === 'offer' ? '💬' : '📦'} {a.label} — <StatusBadge status={a.status} /> <span className="muted">· {ago(a.at, t)}</span></p>)}</Card>
        </div>
      )}
    </div>
  );
}
