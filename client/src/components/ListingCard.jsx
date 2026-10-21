import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CropImage } from './Art.jsx';
import { Badge, Button, Card, StatusBadge } from './ui/Primitives.jsx';
import { OfferModal } from './Dialogs.jsx';
import { useApp } from '../context/AppContext.jsx';
import { useNames } from '../utils/hooks.js';
import { fmtDate, inr, num } from '../utils/format.js';

export function ListingCard({ l, onChanged }) {
  const { t, lang, district, unit } = useNames();
  const { prefs, toggleWish, toggleCompare, user } = useApp();
  const [offer, setOffer] = useState(false);
  const wished = prefs.wishlist.includes(l.id);
  const cmp = prefs.compare.includes(l.id);
  const mine = user?.id === l.sellerId;
  return (
    <Card className="lcard" hover>
      <div className="crop-img">
        <Link to={`/crop/${l.id}`} aria-label={l.cropName} tabIndex={-1} style={{ display: 'block', width: '100%', height: '100%', textDecoration: 'none' }}><CropImage listing={l} /></Link>
        <div className="tl">
          {l.grade !== 'ungraded' && <Badge color="yellow">{t(`grade.${l.grade}`)}</Badge>}
          {l.organic === 'organic' && <Badge color="green" title={t('listing.organicNote')}>🌿 {t('organic.organic')}</Badge>}
        </div>
        <div className="tr">
          <Button size="sm" className="icon" variant={wished ? 'accent' : 'outline'} style={{ background: wished ? undefined : 'var(--surface)' }} aria-pressed={wished} aria-label={wished ? t('listing.unsave') : t('listing.save')} onClick={() => toggleWish(l.id)}>{wished ? '♥' : '♡'}</Button>
        </div>
      </div>
      <div className="lcard-body">
        <div className="row between" style={{ alignItems: 'flex-start', gap: 6 }}>
          <h3 style={{ margin: 0 }}><Link to={`/crop/${l.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>{l.cropName}</Link></h3>
          <StatusBadge status={l.expired ? 'expired' : l.status} />
        </div>
        <div className="muted small">
          {l.seller?.name} {l.seller?.demoVerified && <Badge color="blue" title={t('listing.demoVerifiedNote')}>✔ {t('listing.demoVerified')}</Badge>}<br />
          📍 {l.village ? `${l.village}, ` : ''}{district(l.district)}
        </div>
        <div className="price">{inr(l.price, lang)}<small> / {unit(l.priceUnit)}</small></div>
        <div className="meta">
          <span>📦 {num(l.quantity, lang)} {unit(l.quantityUnit)}</span>
          <span>↧ {t('listing.minOrder')}: {num(l.minOrder, lang)} {unit(l.quantityUnit)}</span>
          <span>🌾 {fmtDate(l.harvestDate, lang)}</span>
          <span>🕒 {t('listing.listed')} {fmtDate(l.createdAt, lang)}</span>
          <span>{l.fulfilment.map((f) => t(`fulfil.${f}`)).join(' · ')}</span>
        </div>
        <div className="lcard-actions">
          <Button as={Link} to={`/crop/${l.id}`} variant="outline" size="sm">{t('listing.viewDetails')}</Button>
          <Button size="sm" variant="accent" disabled={mine || l.status !== 'active' || l.contactPref === 'enquiry'} onClick={() => setOffer(true)}>{t('listing.sendOffer')}</Button>
          <Button size="sm" variant={cmp ? '' : 'ghost'} aria-pressed={cmp} onClick={() => toggleCompare(l.id)}>{cmp ? '✓ ' : '⇄ '}{t('listing.compare')}</Button>
          <Button size="sm" variant="ghost" as={Link} to={`/crop/${l.id}#enquire`}>💬 {t('listing.enquire')}</Button>
        </div>
      </div>
      <OfferModal listing={l} open={offer} onClose={() => setOffer(false)} onDone={onChanged} />
    </Card>
  );
}
