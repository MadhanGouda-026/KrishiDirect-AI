import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { CropImage } from '../components/Art.jsx';
import { Badge, Button, Breadcrumbs, Card, Field, StatusBadge } from '../components/ui/Primitives.jsx';
import { Skeleton, ErrorState } from '../components/ui/Feedback.jsx';
import { ListingCard } from '../components/ListingCard.jsx';
import { OfferModal, EnquiryModal, SwitchIdentityNote } from '../components/Dialogs.jsx';
import { api, useFetch } from '../api/client.js';
import { useApp } from '../context/AppContext.jsx';
import { useNames, usePageTitle } from '../utils/hooks.js';
import { fmtDate, inr, num } from '../utils/format.js';
import { subtotal } from '@shared/units.js';
import { validateRequest } from '@shared/validators.js';
import { districtDistanceKm, transportEstimate } from '@shared/geo.js';

export default function CropDetails() {
  const { id } = useParams();
  const { t, lang, district, unit, valErrors } = useNames();
  const { user, prefs, toggleWish, toggleCompare, pushRecent, toast, fail, refresh, meta } = useApp();
  const navigate = useNavigate();
  const loc = useLocation();
  const { data, loading, error, reload } = useFetch(`/listings/${id}`, [user?.id]);
  const [img, setImg] = useState(0);
  const [qty, setQty] = useState('');
  const [method, setMethod] = useState('pickup');
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [offer, setOffer] = useState(false);
  const [enq, setEnq] = useState(false);
  const l = data?.listing;
  usePageTitle(l?.cropName);
  useEffect(() => { if (l) { pushRecent(l.id); setQty(String(l.minOrder)); setMethod(l.fulfilment[0]); } }, [l?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (loc.hash === '#enquire' && l) setEnq(true); }, [loc.hash, l?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return <div className="container section"><ErrorState error={error} onRetry={reload} /></div>;
  if (loading || !l) return <div className="container section"><Skeleton h={380} /></div>;

  const mine = user?.id === l.sellerId;
  const n = Number(qty);
  const sub = n > 0 ? subtotal(l.price, l.priceUnit, n, l.quantityUnit) : 0;
  const km = user ? districtDistanceKm(user.district, l.district) : null;
  const tr = method === 'delivery' && km != null ? transportEstimate(km, meta?.transportAssumptions) : null;
  const imgs = l.images?.length ? l.images : [null];

  const placeOrder = async () => {
    const v = validateRequest({ quantity: qty, method }, l, { needMethod: true });
    setErrors(valErrors(v.errors));
    if (!v.ok) return;
    setBusy(true);
    try { const o = await api('/orders', { method: 'POST', body: { listingId: l.id, quantity: n, method } }); toast(t('order.placed', { ref: o.ref })); refresh(); navigate('/orders'); }
    catch (e) { if (e.fields) setErrors(valErrors(e.fields)); else fail(e); } finally { setBusy(false); }
  };
  const ctx = data.priceContext;
  const wished = prefs.wishlist.includes(l.id);

  return (
    <div className="container" style={{ paddingBottom: 24 }}>
      <Breadcrumbs items={[{ label: t('nav.marketplace'), to: '/marketplace' }, { label: t(`cat.${l.category}`), to: `/marketplace?category=${l.category}` }, { label: l.cropName }]} />
      <div className="detail-layout">
        <div className="stack">
          <div className="gallery">
            <div className="main crop-img" style={{ aspectRatio: '4/3' }}><CropImage listing={l} index={img} alt={`${l.cropName} — ${district(l.district)}`} /></div>
            {imgs.length > 1 && <div className="thumbs">{imgs.map((s, i) => <button key={i} aria-pressed={img === i} aria-label={`${t('listing.photo')} ${i + 1}`} onClick={() => setImg(i)}><CropImage listing={{ ...l, images: [s] }} /></button>)}</div>}
          </div>
          <Card pad>
            <div className="row between"><h1 style={{ fontSize: 'clamp(1.5rem,4vw,2.2rem)', margin: 0 }}>{l.cropName}</h1><StatusBadge status={l.expired ? 'expired' : l.status} /></div>
            <div className="chips" style={{ margin: '10px 0' }}>
              <Badge color="yellow">{t(`grade.${l.grade}`)}</Badge>
              <Badge color={l.organic === 'organic' ? 'green' : ''} title={l.organic === 'organic' ? t('listing.organicNote') : ''}>{l.organic === 'organic' ? '🌿 ' : ''}{t(`organic.${l.organic}`)}</Badge>
              {l.seller.demoVerified && <Badge color="blue" title={t('listing.demoVerifiedNote')}>✔ {t('listing.demoVerified')}</Badge>}
              {l.fulfilment.map((f) => <Badge key={f}>{t(`fulfil.${f}`)}</Badge>)}
            </div>
            <p>{l.description || t('listing.noDescription')}</p>
            <table className="t" style={{ marginTop: 8 }}><tbody>
              <tr><th scope="row">{t('listing.seller')}</th><td>{l.seller.name} <span className="muted small">({t(`kind.${l.seller.kind}`, { defaultValue: l.seller.kind })})</span></td></tr>
              <tr><th scope="row">{t('listing.pickupLocation')}</th><td>{l.village ? `${l.village}, ` : ''}{district(l.district)}</td></tr>
              <tr><th scope="row">{t('listing.available')}</th><td>{num(l.quantity, lang)} {unit(l.quantityUnit)}</td></tr>
              <tr><th scope="row">{t('listing.minOrder')}</th><td>{num(l.minOrder, lang)} {unit(l.quantityUnit)}</td></tr>
              <tr><th scope="row">{t('listing.harvest')}</th><td>{fmtDate(l.harvestDate, lang)}</td></tr>
              <tr><th scope="row">{t('listing.listed')}</th><td>{fmtDate(l.createdAt, lang)}{l.availableUntil && ` · ${t('listing.until')} ${fmtDate(l.availableUntil, lang)}`}</td></tr>
              <tr><th scope="row">{t('listing.contact')}</th><td>{t('listing.contactPrivate')}</td></tr>
            </tbody></table>
          </Card>
          {ctx && (
            <Card pad>
              <div className="row between"><h3 style={{ margin: 0 }}>📊 {t('listing.priceContext')}</h3><Badge color="yellow">{t('prices.demoLabel')}</Badge></div>
              <p style={{ margin: '8px 0 0' }}>{t('listing.refPrice')}: <strong>{inr(ctx.price, lang, 1)}/{unit(ctx.unit)}</strong>{ctx.range && <> · {t('listing.sampleRange')}: {inr(ctx.range.low, lang, 1)}–{inr(ctx.range.high, lang, 1)}</>}</p>
              <p className="muted small" style={{ margin: '4px 0 0' }}>{t('prices.demoNote')} <Link to="/prices">{t('nav.prices')}</Link></p>
            </Card>
          )}
        </div>

        <div className="sticky-box stack">
          <Card pad>
            <div className="price" style={{ fontSize: '1.8rem' }}>{inr(l.price, lang)}<small> / {unit(l.priceUnit)}</small></div>
            {mine ? (
              <div className="stack"><p className="muted">{t('listing.yours')}</p><Button as={Link} to={`/sell/${l.id}/edit`}>{t('common.edit')}</Button></div>
            ) : user?.role !== 'buyer' ? <SwitchIdentityNote role="buyer" /> : l.status !== 'active' || l.expired ? (
              <div className="notice">{t('listing.unavailable')}</div>
            ) : (
              <div className="stack" style={{ marginTop: 12 }}>
                <Field label={`${t('listing.quantity')} (${unit(l.quantityUnit)})`} required error={errors.quantity} hint={`${t('listing.minOrder')}: ${l.minOrder} · ${t('listing.available')}: ${l.quantity}`}>
                  <input className="input" type="number" min="0" step="any" inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} />
                </Field>
                <Field label={t('order.method')} error={errors.method}>
                  <select className="select" value={method} onChange={(e) => setMethod(e.target.value)}>{l.fulfilment.map((f) => <option key={f} value={f}>{t(`fulfil.${f}`)}</option>)}</select>
                </Field>
                <div className="notice info small">
                  <strong>{t('listing.estSubtotal')}: {inr(sub, lang)}</strong>
                  {tr && <><br />{t('order.transport')}: ≈ {inr(tr.cost, lang, 0)} <span className="muted">({t('order.transportNote', { km: tr.straightKm, road: tr.approxRoadKm })})</span></>}
                  {method === 'delivery' && !tr && <><br />{t('order.noTransport')}</>}
                </div>
                <Button variant="accent" loading={busy} onClick={placeOrder}>🧺 {t('order.place')}</Button>
                <Button variant="outline" onClick={() => setOffer(true)} disabled={l.contactPref === 'enquiry'}>💬 {t('listing.sendOffer')}</Button>
                <Button variant="ghost" onClick={() => setEnq(true)} disabled={l.contactPref === 'offer'}>✉️ {t('listing.enquire')}</Button>
                <p className="muted small" style={{ margin: 0 }}>🛈 {t('demo.noPayment')}</p>
              </div>
            )}
            <div className="row" style={{ marginTop: 12 }}>
              <Button variant={wished ? 'accent' : 'outline'} size="sm" aria-pressed={wished} onClick={() => toggleWish(l.id)}>{wished ? '♥' : '♡'} {wished ? t('listing.unsave') : t('listing.save')}</Button>
              <Button variant={prefs.compare.includes(l.id) ? '' : 'outline'} size="sm" aria-pressed={prefs.compare.includes(l.id)} onClick={() => toggleCompare(l.id)}>⇄ {t('listing.compare')}</Button>
            </div>
          </Card>
        </div>
      </div>

      {data.similar.length > 0 && (
        <section className="section"><h2>{t('listing.similar')}</h2><div className="cards">{data.similar.map((s) => <ListingCard key={s.id} l={s} />)}</div></section>
      )}
      <OfferModal listing={l} open={offer} onClose={() => setOffer(false)} onDone={reload} />
      <EnquiryModal listing={l} open={enq} onClose={() => setEnq(false)} />
    </div>
  );
}
