import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Button, Breadcrumbs, Card, StatusBadge } from '../components/ui/Primitives.jsx';
import { EmptyState, ErrorState, Skeleton } from '../components/ui/Feedback.jsx';
import { ListingCard } from '../components/ListingCard.jsx';
import { CropImage } from '../components/Art.jsx';
import { useListingsByIds } from '../utils/useListings.js';
import { api, useFetch } from '../api/client.js';
import { useApp } from '../context/AppContext.jsx';
import { useNames, usePageTitle } from '../utils/hooks.js';
import { ago, fmtDate, inr, num } from '../utils/format.js';

export function Messages() {
  const { t, lang } = useNames();
  usePageTitle(t('nav.messages'));
  const { user, version, fail, refresh } = useApp();
  const list = useFetch('/threads', [version, user?.id]);
  const [sel, setSel] = useState(null);
  const [thread, setThread] = useState(null);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const open = async (id) => { setSel(id); try { setThread(await api(`/threads/${id}`)); refresh(); } catch (e) { fail(e); } };
  useEffect(() => { setSel(null); setThread(null); }, [user?.id]);
  const send = async (e) => {
    e.preventDefault(); if (!body.trim()) return; setBusy(true);
    try { setThread(await api(`/threads/${sel}/messages`, { method: 'POST', body: { body } })); setBody(''); list.reload(); } catch (err) { fail(err); } finally { setBusy(false); }
  };
  return (
    <div className="container" style={{ paddingBottom: 24 }}>
      <Breadcrumbs items={[{ label: t('nav.messages') }]} />
      <div className="page-head"><h1 style={{ fontSize: 'clamp(1.6rem,4vw,2.3rem)' }}>✉️ {t('msg.title')}</h1><p className="muted">{t('msg.privacy')}</p></div>
      {list.error ? <ErrorState error={list.error} onRetry={list.reload} /> : list.loading ? <Skeleton h={200} /> : list.data.length === 0 ? <EmptyState emoji="✉️" title={t('msg.none')} action={<Button as={Link} to="/marketplace">{t('hero.browse')}</Button>}>{t('msg.noneBody')}</EmptyState> : (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,300px),1fr))', alignItems: 'start' }}>
          <Card>{list.data.map((th) => (
            <button key={th.id} onClick={() => open(th.id)} aria-current={sel === th.id} style={{ display: 'block', width: '100%', textAlign: 'left', padding: 14, border: 0, borderBottom: '1px solid var(--border)', background: sel === th.id ? 'var(--surface2)' : 'transparent', cursor: 'pointer' }}>
              <div className="row between"><strong>{th.other?.name}</strong>{th.unread > 0 && <Badge color="red">{th.unread}</Badge>}</div>
              <div className="small muted">{th.cropName}</div><div className="small" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{th.last?.body}</div>
            </button>))}</Card>
          <Card pad>{!thread ? <p className="muted">{t('msg.select')}</p> : (
            <div className="stack"><div className="row between"><strong>{thread.other?.name} · {thread.cropName}</strong><Link to={`/crop/${thread.listingId}`} className="small">{t('listing.viewDetails')}</Link></div>
              <div className="thread" aria-live="polite">{thread.messages.map((m) => <div key={m.id} className={`bubble-msg ${m.by === user?.id ? 'me' : ''}`}>{m.body}<div className="small muted">{ago(m.at, t)}</div></div>)}</div>
              <form onSubmit={send} className="row" style={{ flexWrap: 'nowrap' }}><input className="input" value={body} maxLength={1000} onChange={(e) => setBody(e.target.value)} placeholder={t('msg.write')} aria-label={t('msg.write')} /><Button type="submit" loading={busy}>{t('common.send')}</Button></form>
              <p className="muted small" style={{ margin: 0 }}>{t('msg.notRealtime')}</p></div>)}</Card>
        </div>)}
    </div>
  );
}

export function Wishlist() {
  const { t } = useNames();
  usePageTitle(t('nav.wishlist'));
  const { prefs } = useApp();
  const saved = useListingsByIds(prefs.wishlist);
  const recent = useListingsByIds(prefs.recent.slice(0, 4));
  return (
    <div className="container" style={{ paddingBottom: 24 }}>
      <Breadcrumbs items={[{ label: t('nav.wishlist') }]} />
      <h1 style={{ fontSize: 'clamp(1.6rem,4vw,2.3rem)' }}>♥ {t('wish.title')}</h1>
      {saved.loading ? <Skeleton h={200} /> : saved.items.length === 0 ? <EmptyState emoji="♡" title={t('wish.empty')} action={<Button as={Link} to="/marketplace">{t('hero.browse')}</Button>}>{t('wish.emptyBody')}</EmptyState> : <div className="cards">{saved.items.map((l) => <ListingCard key={l.id} l={l} />)}</div>}
      <h2 style={{ marginTop: 32 }}>🕘 {t('wish.recent')}</h2>
      {recent.items.length === 0 ? <p className="muted">{t('wish.noRecent')}</p> : <div className="cards">{recent.items.map((l) => <ListingCard key={l.id} l={l} />)}</div>}
    </div>
  );
}

export function Compare() {
  const { t, lang, district, unit } = useNames();
  usePageTitle(t('nav.compare'));
  const { prefs, toggleCompare } = useApp();
  const { items, loading } = useListingsByIds(prefs.compare);
  const rows = [
    ['listing.seller', (l) => l.seller.name], ['listing.pickupLocation', (l) => `${l.village ? l.village + ', ' : ''}${district(l.district)}`],
    ['listing.price', (l) => `${inr(l.price, lang)}/${unit(l.priceUnit)}`], ['listing.available', (l) => `${num(l.quantity, lang)} ${unit(l.quantityUnit)}`],
    ['listing.grade', (l) => t(`grade.${l.grade}`)], ['listing.harvest', (l) => fmtDate(l.harvestDate, lang)], ['listing.minOrder', (l) => `${num(l.minOrder, lang)} ${unit(l.quantityUnit)}`],
    ['market.fulfilment', (l) => l.fulfilment.map((f) => t(`fulfil.${f}`)).join(', ')], ['market.organic', (l) => t(`organic.${l.organic}`)],
  ];
  const low = items.length ? Math.min(...items.map((l) => l.basePrice)) : 0;
  return (
    <div className="container" style={{ paddingBottom: 24 }}>
      <Breadcrumbs items={[{ label: t('nav.compare') }]} />
      <h1 style={{ fontSize: 'clamp(1.6rem,4vw,2.3rem)' }}>⇄ {t('compare.title')}</h1>
      {loading ? <Skeleton h={200} /> : items.length === 0 ? <EmptyState emoji="⇄" title={t('compare.empty')} action={<Button as={Link} to="/marketplace">{t('hero.browse')}</Button>}>{t('compare.emptyBody')}</EmptyState> : (
        <>
          <p className="muted small">{t('compare.note')}</p>
          <div className="table-wrap"><table className="t">
            <thead><tr><th scope="col"><span className="sr-only">{t('listing.crop')}</span></th>{items.map((l) => (
              <th key={l.id} scope="col" style={{ minWidth: 170 }}><div className="crop-img" style={{ aspectRatio: '16/10', borderRadius: 10, marginBottom: 8 }}><CropImage listing={l} /></div><Link to={`/crop/${l.id}`}>{l.cropName}</Link><br /><Button size="sm" variant="ghost" onClick={() => toggleCompare(l.id)}>✕ {t('common.delete')}</Button></th>))}</tr></thead>
            <tbody>{rows.map(([k, fn]) => <tr key={k}><th scope="row">{t(k)}</th>{items.map((l) => <td key={l.id} className={k === 'listing.price' && l.basePrice === low && items.length > 1 ? 'best' : ''}>{fn(l)}{k === 'listing.price' && l.basePrice === low && items.length > 1 && <><br /><Badge color="green">{t('compare.lowest')}</Badge></>}</td>)}</tr>)}</tbody>
          </table></div>
        </>)}
    </div>
  );
}

export function Notifications() {
  const { t, lang } = useNames();
  usePageTitle(t('nav.notifications'));
  const { user, version, refresh, fail } = useApp();
  const { data, loading, reload } = useFetch('/notifications', [version, user?.id]);
  const markAll = async () => { try { await api('/notifications/read-all', { method: 'POST' }); reload(); refresh(); } catch (e) { fail(e); } };
  const mark = async (id) => { try { await api(`/notifications/${id}/read`, { method: 'POST' }); reload(); refresh(); } catch (e) { fail(e); } };
  return (
    <div className="container" style={{ paddingBottom: 24, maxWidth: 820 }}>
      <Breadcrumbs items={[{ label: t('nav.notifications') }]} />
      <div className="row between page-head"><h1 style={{ fontSize: 'clamp(1.6rem,4vw,2.3rem)' }}>🔔 {t('nav.notifications')}</h1><Button variant="outline" onClick={markAll} disabled={!data?.some((n) => !n.read)}>{t('notif.markAll')}</Button></div>
      {loading ? <Skeleton h={160} /> : data.length === 0 ? <EmptyState emoji="🔔" title={t('notif.empty')}>{t('notif.emptyBody')}</EmptyState> : (
        <div className="stack">{data.map((n) => (
          <Card key={n.id} pad style={{ borderLeft: `5px solid ${n.read ? 'var(--border)' : 'var(--orange)'}` }}>
            <div className="row between"><Link to={n.link || '/'} onClick={() => !n.read && mark(n.id)} style={{ fontWeight: n.read ? 400 : 700, color: 'inherit' }}>{t(`notif.${n.type}`, n.data)}</Link>{!n.read && <Button size="sm" variant="ghost" onClick={() => mark(n.id)}>{t('notif.markRead')}</Button>}</div>
            <span className="small muted">{ago(n.at, t)} · {fmtDate(n.at, lang)}</span>
          </Card>))}</div>)}
    </div>
  );
}
