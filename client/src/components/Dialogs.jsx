import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Modal } from './ui/Overlays.jsx';
import { Button, Field } from './ui/Primitives.jsx';
import { api } from '../api/client.js';
import { useApp } from '../context/AppContext.jsx';
import { useNames } from '../utils/hooks.js';
import { validateRequest } from '@shared/validators.js';
import { subtotal } from '@shared/units.js';
import { inr } from '../utils/format.js';

/** Shown when the current demo identity can't perform a buyer action. */
export function SwitchIdentityNote({ role }) {
  const { t } = useNames();
  const { users, switchUser, user } = useApp();
  const target = users.find((u) => u.role === role && u.id !== user?.id);
  return (
    <div className="notice info stack">
      <p style={{ margin: 0 }}>{t(role === 'buyer' ? 'demo.needBuyer' : 'demo.needFarmer')}</p>
      {target && <Button size="sm" onClick={() => switchUser(target.id)}>{t('demo.switchTo', { name: target.name })}</Button>}
    </div>
  );
}

export function OfferModal({ listing, open, onClose, onDone }) {
  const { t, lang, valErrors, unit } = useNames();
  const { user, toast, fail, refresh } = useApp();
  const [f, setF] = useState({ quantity: '', price: '', note: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setF({ quantity: listing.minOrder, price: listing.price, note: '' }); setErrors({}); } }, [open, listing]);
  if (!listing) return null;
  const qty = Number(f.quantity), price = Number(f.price);
  const sub = qty > 0 && price > 0 ? subtotal(price, listing.priceUnit, qty, listing.quantityUnit) : 0;
  const submit = async (e) => {
    e.preventDefault();
    const v = validateRequest(f, listing, { needPrice: true });
    setErrors(valErrors(v.errors));
    if (!v.ok) return;
    setBusy(true);
    try {
      await api('/offers', { method: 'POST', body: { listingId: listing.id, ...f } });
      toast(t('offer.sent')); refresh(); onDone?.(); onClose();
    } catch (err) { if (err.fields) setErrors(valErrors(err.fields)); else fail(err); } finally { setBusy(false); }
  };
  return (
    <Modal open={open} onClose={onClose} title={`${t('offer.title')}: ${listing.cropName}`}>
      {user?.role !== 'buyer' ? <SwitchIdentityNote role="buyer" /> : (
        <form onSubmit={submit} noValidate className="stack">
          <p className="muted small">{t('offer.listed')}: {inr(listing.price, lang)} / {unit(listing.priceUnit)} · {t('listing.minOrder')} {listing.minOrder} {unit(listing.quantityUnit)}</p>
          <Field label={`${t('offer.quantity')} (${unit(listing.quantityUnit)})`} required error={errors.quantity}><input className="input" type="number" inputMode="decimal" min="0" step="any" value={f.quantity} onChange={(e) => setF({ ...f, quantity: e.target.value })} /></Field>
          <Field label={`${t('offer.price')} (₹ / ${unit(listing.priceUnit)})`} required error={errors.price}><input className="input" type="number" inputMode="decimal" min="0" step="any" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} /></Field>
          <Field label={t('offer.note')} error={errors.note}><textarea className="textarea" maxLength={300} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></Field>
          <p><strong>{t('offer.subtotal')}: {inr(sub, lang)}</strong><br /><span className="muted small">{t('demo.noPayment')}</span></p>
          <div className="row" style={{ justifyContent: 'flex-end' }}><Button variant="outline" onClick={onClose}>{t('common.cancel')}</Button><Button type="submit" loading={busy}>{t('offer.submit')}</Button></div>
        </form>
      )}
    </Modal>
  );
}

export function EnquiryModal({ listing, open, onClose }) {
  const { t } = useNames();
  const { user, toast, fail, refresh } = useApp();
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  useEffect(() => { if (open) { setBody(''); setError(''); setSent(false); } }, [open]);
  const submit = async (e) => {
    e.preventDefault();
    if (!body.trim()) { setError(t('val.required')); return; }
    setBusy(true);
    try { await api('/threads', { method: 'POST', body: { listingId: listing.id, body } }); toast(t('msg.sent')); refresh(); setSent(true); }
    catch (err) { fail(err); } finally { setBusy(false); }
  };
  return (
    <Modal open={open} onClose={onClose} title={`${t('listing.enquire')}: ${listing.cropName}`}>
      {user?.role !== 'buyer' ? <SwitchIdentityNote role="buyer" /> : sent ? (
        <div className="stack"><p>✅ {t('msg.sent')}</p><Button as={Link} to="/messages">{t('nav.messages')}</Button></div>
      ) : (
        <form onSubmit={submit} noValidate className="stack">
          <p className="muted small">{t('msg.privacy')}</p>
          <Field label={t('msg.write')} required error={error}><textarea className="textarea" maxLength={1000} value={body} onChange={(e) => setBody(e.target.value)} /></Field>
          <div className="row" style={{ justifyContent: 'flex-end' }}><Button variant="outline" onClick={onClose}>{t('common.cancel')}</Button><Button type="submit" loading={busy}>{t('common.send')}</Button></div>
        </form>
      )}
    </Modal>
  );
}
