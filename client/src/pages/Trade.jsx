import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Button, Breadcrumbs, Card, Field, StatusBadge, Tabs } from '../components/ui/Primitives.jsx';
import { Modal } from '../components/ui/Overlays.jsx';
import { EmptyState, ErrorState, Skeleton } from '../components/ui/Feedback.jsx';
import { api, useFetch } from '../api/client.js';
import { useApp } from '../context/AppContext.jsx';
import { useNames, usePageTitle } from '../utils/hooks.js';
import { downloadCsv } from '../utils/csv.js';
import { ago, fmtDateTime, inr, num } from '../utils/format.js';
import { subtotal } from '@shared/units.js';

const OPEN = ['placed', 'confirmed', 'prepared', 'dispatched', 'ready_for_pickup'];

function orderActions(o, role) {
  const a = [];
  if (role === 'seller') {
    if (o.status === 'placed') a.push(['confirm', ''], ['reject', 'danger']);
    if (o.status === 'confirmed') a.push(['prepare', '']);
    if (o.status === 'prepared') a.push(['dispatch', '']);
  } else {
    if (['placed', 'confirmed'].includes(o.status)) a.push(['cancel', 'danger']);
    if (['dispatched', 'ready_for_pickup'].includes(o.status)) a.push(['receive', '']);
  }
  return a;
}

export function Orders() {
  const { t, lang, unit } = useNames();
  usePageTitle(t('nav.orders'));
  const { user, version, toast, fail, refresh, confirm } = useApp();
  const { data, loading, error, reload } = useFetch('/orders', [version, user?.id]);
  const [tab, setTab] = useState('open');
  const list = (data || []).filter((o) => (tab === 'all' ? true : tab === 'open' ? OPEN.includes(o.status) : !OPEN.includes(o.status)));
  const act = async (o, action) => {
    if (['reject', 'cancel'].includes(action) && !(await confirm({ title: t(`order.a_${action}`), body: t('order.confirmBody', { ref: o.ref }), danger: true, confirmLabel: t(`order.a_${action}`) }))) return;
    try { await api(`/orders/${o.id}/${action}`, { method: 'POST' }); toast(t('order.updated')); refresh(); reload(); } catch (e) { fail(e); }
  };
  const exportCsv = () => downloadCsv('orders.csv', (data || []).map((o) => ({ reference: o.ref, crop: o.cropName, seller: o.sellerName, buyer: o.buyerName, quantity: o.quantity, unit: o.quantityUnit, price: o.price, price_unit: o.priceUnit, subtotal_inr: o.subtotal, method: o.method, status: o.status, demo_order: 'yes', created: o.createdAt })));
  return (
    <div className="container" style={{ paddingBottom: 24 }}>
      <Breadcrumbs items={[{ label: t('nav.orders') }]} />
      <div className="row between page-head"><div><h1 style={{ fontSize: 'clamp(1.6rem,4vw,2.3rem)' }}>📦 {t('order.title')}</h1><p className="muted">{t('demo.noPayment')}</p></div><Button variant="outline" onClick={exportCsv} disabled={!data?.length}>⬇ {t('common.exportCsv')}</Button></div>
      <Tabs label={t('nav.orders')} value={tab} onChange={setTab} tabs={[{ key: 'open', label: t('order.open') }, { key: 'done', label: t('order.closed') }, { key: 'all', label: t('common.all'), count: data?.length }]} />
      <div className="stack" style={{ marginTop: 16 }}>
        {error ? <ErrorState error={error} onRetry={reload} /> : loading ? <Skeleton h={160} /> : list.length === 0 ? <EmptyState emoji="📦" title={t('order.none')} action={<Button as={Link} to="/marketplace">{t('hero.browse')}</Button>}>{t('order.noneBody')}</EmptyState> : list.map((o) => {
          const role = o.sellerId === user?.id ? 'seller' : 'buyer';
          return (
            <Card key={o.id} pad>
              <div className="row between"><div><strong>{o.ref}</strong> <Badge color="yellow">{t('demo.orderWord')}</Badge></div><StatusBadge status={o.status} /></div>
              <h3 style={{ margin: '8px 0 4px' }}><Link to={`/crop/${o.listingId}`}>{o.cropName}</Link></h3>
              <div className="grid g3 small" style={{ gap: 6 }}>
                <span>{role === 'seller' ? `${t('order.buyer')}: ${o.buyerName}` : `${t('listing.seller')}: ${o.sellerName}`}</span>
                <span>{t('listing.quantity')}: {num(o.quantity, lang)} {unit(o.quantityUnit)}</span>
                <span>{t('listing.price')}: {inr(o.price, lang)}/{unit(o.priceUnit)}</span>
                <span><strong>{t('offer.subtotal')}: {inr(o.subtotal, lang)}</strong></span>
                <span>{t('order.method')}: {t(`fulfil.${o.method}`)}{o.transport && ` (≈ ${inr(o.transport.cost, lang, 0)} ${t('order.transport').toLowerCase()})`}</span>
                <span>📍 {o.pickupLocation}</span>
              </div>
              <details style={{ marginTop: 10 }}><summary>{t('order.timeline')}</summary>
                <ol className="timeline" style={{ marginTop: 10 }}>{o.timeline.map((s, i) => <li key={i}><StatusBadge status={s.status} /> <span className="muted small">{fmtDateTime(s.at, lang)}</span></li>)}</ol></details>
              <div className="row" style={{ marginTop: 10 }}>
                {orderActions(o, role).map(([a, v]) => <Button key={a} size="sm" variant={v || 'outline'} onClick={() => act(o, a)}>{a === 'dispatch' && o.method === 'pickup' ? t('order.a_ready') : t(`order.a_${a}`)}</Button>)}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export function Offers() {
  const { t, lang, unit, valErrors } = useNames();
  usePageTitle(t('nav.offers'));
  const { user, version, toast, fail, refresh, confirm } = useApp();
  const { data, loading, error, reload } = useFetch('/offers', [version, user?.id]);
  const [tab, setTab] = useState('open');
  const [counter, setCounter] = useState(null);
  const [cf, setCf] = useState({ price: '', quantity: '', note: '' });
  const [errs, setErrs] = useState({});
  const [busy, setBusy] = useState(false);
  const isOpen = (o) => ['pending', 'countered'].includes(o.status);
  const list = (data || []).filter((o) => (tab === 'all' ? true : tab === 'open' ? isOpen(o) : !isOpen(o)));
  const act = async (o, action, body) => {
    if (['accept', 'reject'].includes(action) && !(await confirm({ title: t(`offer.a_${action}`), body: t(`offer.confirm_${action}`), danger: action === 'reject', confirmLabel: t(`offer.a_${action}`) }))) return;
    try { const r = await api(`/offers/${o.id}/${action}`, { method: 'POST', body }); toast(r.order ? t('offer.acceptedOrder', { ref: r.order.ref }) : t('offer.updated')); refresh(); reload(); return true; } catch (e) { if (e.fields) setErrs(valErrors(e.fields)); else fail(e); return false; }
  };
  const submitCounter = async (e) => {
    e.preventDefault(); setBusy(true);
    if (await act(counter, 'counter', cf)) setCounter(null);
    setBusy(false);
  };
  const exportCsv = () => downloadCsv('offers.csv', (data || []).map((o) => ({ id: o.id, crop: o.listing?.cropName, buyer: o.buyerName, seller: o.sellerName, price: o.price, quantity: o.quantity, subtotal_inr: o.subtotal, status: o.status, created: o.createdAt })));
  return (
    <div className="container" style={{ paddingBottom: 24 }}>
      <Breadcrumbs items={[{ label: t('nav.offers') }]} />
      <div className="row between page-head"><div><h1 style={{ fontSize: 'clamp(1.6rem,4vw,2.3rem)' }}>💬 {t('offer.pageTitle')}</h1><p className="muted">{t('offer.ttl')}</p></div><Button variant="outline" onClick={exportCsv} disabled={!data?.length}>⬇ {t('common.exportCsv')}</Button></div>
      <Tabs label={t('nav.offers')} value={tab} onChange={setTab} tabs={[{ key: 'open', label: t('offer.open') }, { key: 'done', label: t('offer.closed') }, { key: 'all', label: t('common.all'), count: data?.length }]} />
      <div className="stack" style={{ marginTop: 16 }}>
        {error ? <ErrorState error={error} onRetry={reload} /> : loading ? <Skeleton h={160} /> : list.length === 0 ? <EmptyState emoji="💬" title={t('offer.none')} action={<Button as={Link} to="/marketplace">{t('hero.browse')}</Button>}>{t('offer.noneBody')}</EmptyState> : list.map((o) => {
          const role = o.sellerId === user?.id ? 'seller' : 'buyer';
          return (
            <Card key={o.id} pad>
              <div className="row between"><strong>{o.listing ? <Link to={`/crop/${o.listing.id}`}>{o.listing.cropName}</Link> : '—'}</strong><StatusBadge status={o.status} /></div>
              <p className="small muted" style={{ margin: '4px 0' }}>{role === 'seller' ? `${t('order.buyer')}: ${o.buyerName}` : `${t('listing.seller')}: ${o.sellerName}`} · ID {o.id}</p>
              <p style={{ margin: '4px 0' }}><strong>{inr(o.price, lang)}/{unit(o.listing?.priceUnit)}</strong> × {num(o.quantity, lang)} {unit(o.listing?.quantityUnit)} = <strong>{inr(o.subtotal, lang)}</strong> <span className="muted small">(listed {inr(o.listing?.price, lang)})</span></p>
              {isOpen(o) && <p className="small muted" style={{ margin: 0 }}>⏳ {t('offer.expires')}: {fmtDateTime(o.expiresAt, lang)}</p>}
              <details style={{ marginTop: 8 }}><summary>{t('offer.history')} ({o.history.length})</summary>
                <ol className="timeline" style={{ marginTop: 10 }}>{o.history.map((h, i) => <li key={i}><strong>{t(`offer.h_${h.type}`)}</strong>{h.price ? ` ₹${h.price} × ${h.quantity}` : ''} <span className="muted small">· {h.by === 'system' ? t('offer.system') : h.by === o.buyerId ? o.buyerName : o.sellerName} · {ago(h.at, t)}</span>{h.note && <div className="small muted">“{h.note}”</div>}</li>)}</ol></details>
              <div className="row" style={{ marginTop: 10 }}>
                {o.status === 'pending' && role === 'seller' && <><Button size="sm" onClick={() => act(o, 'accept')}>✔ {t('offer.a_accept')}</Button><Button size="sm" variant="outline" onClick={() => { setCounter(o); setCf({ price: o.price, quantity: o.quantity, note: '' }); setErrs({}); }}>↔ {t('offer.a_counter')}</Button><Button size="sm" variant="danger" onClick={() => act(o, 'reject')}>{t('offer.a_reject')}</Button></>}
                {o.status === 'countered' && role === 'buyer' && <><Button size="sm" onClick={() => act(o, 'accept')}>✔ {t('offer.a_acceptCounter')}</Button><Button size="sm" variant="danger" onClick={() => act(o, 'reject')}>{t('offer.a_reject')}</Button></>}
                {isOpen(o) && role === 'buyer' && <Button size="sm" variant="outline" onClick={() => act(o, 'withdraw')}>{t('offer.a_withdraw')}</Button>}
                {isOpen(o) && role === 'seller' && o.status === 'countered' && <Badge color="orange">{t('offer.waitingBuyer')}</Badge>}
              </div>
            </Card>
          );
        })}
      </div>
      <Modal open={!!counter} onClose={() => setCounter(null)} title={t('offer.a_counter')}>
        {counter && <form onSubmit={submitCounter} className="stack" noValidate>
          <Field label={`${t('offer.price')} (₹ / ${unit(counter.listing?.priceUnit)})`} required error={errs.price}><input className="input" type="number" min="0" step="any" value={cf.price} onChange={(e) => setCf({ ...cf, price: e.target.value })} /></Field>
          <Field label={`${t('offer.quantity')} (${unit(counter.listing?.quantityUnit)})`} required error={errs.quantity}><input className="input" type="number" min="0" step="any" value={cf.quantity} onChange={(e) => setCf({ ...cf, quantity: e.target.value })} /></Field>
          <Field label={t('offer.note')}><textarea className="textarea" maxLength={300} value={cf.note} onChange={(e) => setCf({ ...cf, note: e.target.value })} /></Field>
          <p><strong>{t('offer.subtotal')}: {inr(subtotal(Number(cf.price) || 0, counter.listing?.priceUnit || 'kg', Number(cf.quantity) || 0, counter.listing?.quantityUnit || 'kg'), lang)}</strong></p>
          <div className="row" style={{ justifyContent: 'flex-end' }}><Button variant="outline" onClick={() => setCounter(null)}>{t('common.cancel')}</Button><Button type="submit" loading={busy}>{t('offer.sendCounter')}</Button></div>
        </form>}
      </Modal>
    </div>
  );
}
