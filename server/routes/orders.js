import { Router } from 'express';
import { db } from '../db.js';
import { requireRole } from '../auth.js';
import { nowIso, wrap, bad, forbidden, notFound, conflict } from '../util.js';
import { validateRequest } from '../../shared/validators.js';
import { notify } from '../domain/notify.js';
import { createOrder, restoreStock, ORDER_TRANSITIONS } from '../domain/orders.js';
import { isExpiredListing } from '../domain/sweep.js';

export const router = Router();

router.get('/', (req, res) => {
  const mine = db().orders.filter((o) => o.buyerId === req.user.id || o.sellerId === req.user.id);
  res.json(mine.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
});

router.post('/', requireRole('buyer'), wrap((req, res) => {
  const l = db().listings.find((x) => x.id === req.body.listingId);
  if (!l || l.status !== 'active' || isExpiredListing(l)) throw notFound();
  const { ok, errors } = validateRequest(req.body, l, { needMethod: true });
  if (!ok) throw bad(errors);
  const order = createOrder({ listing: l, buyer: req.user, quantity: Number(req.body.quantity), method: req.body.method, note: String(req.body.note || '').slice(0, 300) });
  notify(l.sellerId, 'orderNew', { ref: order.ref, buyer: req.user.name }, '/orders');
  res.status(201).json(order);
}));

router.post('/:id/:action', wrap((req, res) => {
  const o = db().orders.find((x) => x.id === req.params.id);
  if (!o) throw notFound();
  const role = o.sellerId === req.user.id ? 'seller' : o.buyerId === req.user.id ? 'buyer' : null;
  if (!role) throw forbidden();
  const rule = ORDER_TRANSITIONS[req.params.action];
  if (!rule) throw notFound();
  if (rule.actor !== role) throw forbidden();
  if (!rule.from.includes(o.status)) throw conflict('badState');
  const to = typeof rule.to === 'function' ? rule.to(o) : rule.to;
  if (['rejected', 'cancelled'].includes(to)) restoreStock(o);
  o.status = to;
  o.updatedAt = nowIso();
  o.timeline.push({ status: to, at: o.updatedAt, by: req.user.id });
  notify(role === 'seller' ? o.buyerId : o.sellerId, 'orderStatus', { ref: o.ref, status: to }, '/orders');
  res.json(o);
}));
