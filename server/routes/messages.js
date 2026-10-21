// Persisted enquiry threads (not real-time chat). Private contact details are never exposed here.
import { Router } from 'express';
import { db } from '../db.js';
import { uid, nowIso, wrap, bad, forbidden, notFound } from '../util.js';
import { notify } from '../domain/notify.js';

export const router = Router();

function view(t, me) {
  const d = db();
  const l = d.listings.find((x) => x.id === t.listingId);
  const other = d.users.find((u) => u.id === (t.buyerId === me ? t.sellerId : t.buyerId));
  return {
    ...t, cropName: l?.cropName || '—', other: other && { id: other.id, name: other.name },
    unread: t.messages.filter((m) => m.by !== me && !m.readBy.includes(me)).length,
    last: t.messages.at(-1),
  };
}
const body = (b) => {
  const s = String(b ?? '').trim();
  if (!s) throw bad({ body: 'required' });
  if (s.length > 1000) throw bad({ body: 'tooLong' });
  return s;
};

router.get('/', (req, res) => {
  const mine = db().threads.filter((t) => t.buyerId === req.user.id || t.sellerId === req.user.id);
  res.json(mine.map((t) => view(t, req.user.id)).sort((a, b) => (b.last?.at || '').localeCompare(a.last?.at || '')));
});

router.get('/:id', (req, res) => {
  const t = db().threads.find((x) => x.id === req.params.id);
  if (!t) throw notFound();
  if (![t.buyerId, t.sellerId].includes(req.user.id)) throw forbidden();
  t.messages.forEach((m) => { if (m.by !== req.user.id && !m.readBy.includes(req.user.id)) m.readBy.push(req.user.id); });
  res.json(view(t, req.user.id));
});

// Buyer starts (or continues) an enquiry about a listing.
router.post('/', wrap((req, res) => {
  const l = db().listings.find((x) => x.id === req.body.listingId);
  if (!l || l.status === 'draft') throw notFound();
  if (req.user.role !== 'buyer') throw forbidden();
  if (l.contactPref === 'offer') throw forbidden();
  let t = db().threads.find((x) => x.listingId === l.id && x.buyerId === req.user.id);
  if (!t) { t = { id: uid('thr'), listingId: l.id, buyerId: req.user.id, sellerId: l.sellerId, createdAt: nowIso(), messages: [] }; db().threads.unshift(t); }
  t.messages.push({ id: uid('m'), by: req.user.id, body: body(req.body.body), at: nowIso(), readBy: [req.user.id] });
  notify(l.sellerId, 'enquiryNew', { crop: l.cropName, buyer: req.user.name }, '/messages');
  res.status(201).json(view(t, req.user.id));
}));

router.post('/:id/messages', wrap((req, res) => {
  const t = db().threads.find((x) => x.id === req.params.id);
  if (!t) throw notFound();
  if (![t.buyerId, t.sellerId].includes(req.user.id)) throw forbidden();
  t.messages.push({ id: uid('m'), by: req.user.id, body: body(req.body.body), at: nowIso(), readBy: [req.user.id] });
  const l = db().listings.find((x) => x.id === t.listingId);
  notify(t.buyerId === req.user.id ? t.sellerId : t.buyerId, 'enquiryReply', { crop: l?.cropName || '', from: req.user.name }, '/messages');
  res.status(201).json(view(t, req.user.id));
}));
