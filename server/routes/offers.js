import { Router } from 'express';
import { db } from '../db.js';
import { requireRole } from '../auth.js';
import { uid, nowIso, wrap, bad, forbidden, notFound, conflict } from '../util.js';
import { validateRequest } from '../../shared/validators.js';
import { subtotal } from '../../shared/units.js';
import { notify } from '../domain/notify.js';
import { createOrder } from '../domain/orders.js';
import { OFFER_TTL_HOURS, isExpiredListing } from '../domain/sweep.js';

export const router = Router();
const expiry = () => new Date(Date.now() + OFFER_TTL_HOURS * 36e5).toISOString();

// status -> action -> who may do it -> resulting status
const TRANSITIONS = {
  pending: { accept: ['seller', 'accepted'], reject: ['seller', 'rejected'], counter: ['seller', 'countered'], withdraw: ['buyer', 'withdrawn'] },
  countered: { accept: ['buyer', 'accepted'], reject: ['buyer', 'rejected'], withdraw: ['buyer', 'withdrawn'] },
};

function view(o) {
  const l = db().listings.find((x) => x.id === o.listingId);
  const seller = db().users.find((u) => u.id === o.sellerId);
  return {
    ...o,
    sellerName: seller?.name,
    listing: l && { id: l.id, cropName: l.cropName, cropKey: l.cropKey, price: l.price, priceUnit: l.priceUnit, quantityUnit: l.quantityUnit, available: l.quantity, status: l.status, district: l.district },
    subtotal: l ? subtotal(o.price, l.priceUnit, o.quantity, l.quantityUnit) : null,
  };
}

router.get('/', (req, res) => {
  const mine = db().offers.filter((o) => o.buyerId === req.user.id || o.sellerId === req.user.id);
  res.json(mine.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map(view));
});

router.post('/', requireRole('buyer'), wrap((req, res) => {
  const l = db().listings.find((x) => x.id === req.body.listingId);
  if (!l || l.status !== 'active' || isExpiredListing(l)) throw notFound();
  if (l.contactPref === 'enquiry') throw conflict('offersDisabled');
  const { ok, errors } = validateRequest(req.body, l, { needPrice: true });
  if (!ok) throw bad(errors);
  const dup = db().offers.find((o) => o.listingId === l.id && o.buyerId === req.user.id && ['pending', 'countered'].includes(o.status));
  if (dup) throw conflict('duplicateOffer');
  const at = nowIso();
  const note = String(req.body.note || '').trim();
  const o = {
    id: uid('off'), listingId: l.id, buyerId: req.user.id, buyerName: req.user.name, sellerId: l.sellerId,
    price: Number(req.body.price), quantity: Number(req.body.quantity), note, status: 'pending', expiresAt: expiry(),
    history: [{ type: 'offer', by: req.user.id, price: Number(req.body.price), quantity: Number(req.body.quantity), note, at }],
    createdAt: at, updatedAt: at,
  };
  db().offers.unshift(o);
  notify(l.sellerId, 'offerNew', { crop: l.cropName, buyer: req.user.name }, '/offers');
  res.status(201).json(view(o));
}));

router.post('/:id/:action', wrap((req, res) => {
  const o = db().offers.find((x) => x.id === req.params.id);
  if (!o) throw notFound();
  const role = o.sellerId === req.user.id ? 'seller' : o.buyerId === req.user.id ? 'buyer' : null;
  if (!role) throw forbidden(); // cannot touch someone else's offer
  const rule = TRANSITIONS[o.status]?.[req.params.action];
  if (!rule) throw conflict('badState');
  if (rule[0] !== role) throw forbidden(); // e.g. buyers cannot accept their own pending offer
  const l = db().listings.find((x) => x.id === o.listingId);
  if (!l) throw conflict('listingGone');
  const at = nowIso();
  const entry = { type: req.params.action, by: req.user.id, at };
  let order = null;

  if (req.params.action === 'counter') {
    const { ok, errors } = validateRequest({ price: req.body.price, quantity: req.body.quantity ?? o.quantity }, l, { needPrice: true });
    if (!ok) throw bad(errors);
    Object.assign(entry, { price: Number(req.body.price), quantity: Number(req.body.quantity ?? o.quantity), note: String(req.body.note || '').slice(0, 300) });
    o.price = entry.price; o.quantity = entry.quantity; o.expiresAt = expiry();
    notify(o.buyerId, 'offerCountered', { crop: l.cropName, price: entry.price }, '/offers');
  } else if (req.params.action === 'accept') {
    if (l.status !== 'active' || o.quantity > l.quantity) throw conflict('exceedsStock');
    const buyer = db().users.find((u) => u.id === o.buyerId);
    const method = l.fulfilment.includes('pickup') ? 'pickup' : 'delivery';
    order = createOrder({ listing: l, buyer, quantity: o.quantity, method, price: o.price, offerId: o.id, status: 'confirmed' });
    o.orderId = order.id;
    notify(role === 'seller' ? o.buyerId : o.sellerId, 'offerAccepted', { crop: l.cropName, ref: order.ref }, '/orders');
    if (role === 'buyer') notify(o.sellerId, 'orderNew', { ref: order.ref, buyer: buyer.name }, '/orders');
  } else if (req.params.action === 'reject') {
    notify(role === 'seller' ? o.buyerId : o.sellerId, 'offerRejected', { crop: l.cropName }, '/offers');
  } else if (req.params.action === 'withdraw') {
    notify(o.sellerId, 'offerWithdrawn', { crop: l.cropName, buyer: o.buyerName }, '/offers');
  }
  o.status = rule[1];
  o.history.push(entry);
  o.updatedAt = at;
  res.json({ offer: view(o), order });
}));
