import { Router } from 'express';
import { db } from '../db.js';
import { requireRole } from '../auth.js';
import { uid, nowIso, wrap, bad, forbidden, notFound, conflict, dateOnly } from '../util.js';
import { validateListing } from '../../shared/validators.js';
import { findCrop, matchesQuery } from '../../shared/crops.js';
import { basePrice, baseUnit, toBase } from '../../shared/units.js';
import { districtByKey } from '../../shared/geo.js';
import { notify } from '../domain/notify.js';
import { isExpiredListing } from '../domain/sweep.js';
import { OPEN_STATUSES } from '../domain/orders.js';
import { latestAvg, suggestedRange } from '../services/prices.js';

export const router = Router();

export function viewListing(l) {
  const d = db();
  const s = d.users.find((u) => u.id === l.sellerId);
  return {
    ...l,
    image: l.images?.[0] || '',
    expired: isExpiredListing(l),
    basePrice: basePrice(l.price || 0, l.priceUnit),
    baseUnit: baseUnit(l.priceUnit),
    offerCount: d.offers.filter((o) => o.listingId === l.id).length,
    seller: s && { id: s.id, name: s.name, kind: s.kind, district: s.district, village: s.village, demoVerified: !!s.demoVerified },
  };
}

function filterListings(items, q, user) {
  const num = (v) => (v === undefined || v === '' ? null : Number(v));
  const minP = num(q.minPrice), maxP = num(q.maxPrice), minQ = num(q.minQty), maxMin = num(q.maxMinOrder);
  return items.filter((l) => {
    if (q.sellerId) { if (l.sellerId !== q.sellerId || (q.sellerId !== user.id && l.status !== 'active')) return false; }
    else if (l.status !== 'active' || isExpiredListing(l)) return false;
    if (q.q && !matchesQuery(l, q.q, districtByKey(l.district)?.en)) return false;
    if (q.category && l.category !== q.category) return false;
    if (q.district && !q.district.split(',').includes(l.district)) return false;
    if (q.grade && l.grade !== q.grade) return false;
    if (q.organic && l.organic !== q.organic) return false;
    if (q.fulfilment && !l.fulfilment.includes(q.fulfilment)) return false;
    if (q.verified === '1' && !db().users.find((u) => u.id === l.sellerId)?.demoVerified) return false;
    if (q.harvestAfter && l.harvestDate < q.harvestAfter) return false;
    const bp = basePrice(l.price, l.priceUnit);
    if (minP !== null && bp < minP) return false;
    if (maxP !== null && bp > maxP) return false;
    if (minQ !== null && toBase(l.quantity, l.quantityUnit) < minQ) return false;
    if (maxMin !== null && toBase(l.minOrder, l.quantityUnit) > maxMin) return false;
    return true;
  });
}

const SORTS = {
  newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
  priceAsc: (a, b) => a.basePrice - b.basePrice,
  priceDesc: (a, b) => b.basePrice - a.basePrice,
  quantity: (a, b) => toBase(b.quantity, b.quantityUnit) - toBase(a.quantity, a.quantityUnit),
  popularity: (a, b) => b.views + b.offerCount * 5 - (a.views + a.offerCount * 5),
};

router.get('/', (req, res) => {
  const q = req.query;
  let items = filterListings(db().listings, q, req.user).map(viewListing);
  items.sort(SORTS[q.sort] || SORTS.newest);
  const pageSize = Math.min(48, Math.max(1, Number(q.pageSize) || 9));
  const total = items.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(pages, Math.max(1, Number(q.page) || 1));
  res.json({ items: items.slice((page - 1) * pageSize, page * pageSize), total, page, pages });
});

router.get('/:id', (req, res) => {
  const l = db().listings.find((x) => x.id === req.params.id);
  if (!l) throw notFound();
  if (l.status === 'draft' && l.sellerId !== req.user.id) throw notFound();
  if (l.sellerId !== req.user.id) l.views += 1;
  const similar = db().listings
    .filter((x) => x.id !== l.id && x.status === 'active' && !isExpiredListing(x) && (x.cropKey === l.cropKey || x.category === l.category))
    .slice(0, 4).map(viewListing);
  res.json({
    listing: viewListing(l), similar,
    priceContext: l.cropKey ? { ...latestAvg(l.cropKey), range: suggestedRange(l.cropKey), demo: true } : null,
  });
});

function build(body, user, existing) {
  const draft = body.status === 'draft';
  const { ok, errors, value } = validateListing(body, { draft });
  if (!ok) throw bad(errors);
  const crop = findCrop(value.cropName);
  const { images, ...rest } = value;
  return { ...(existing || {}), ...rest, images, cropKey: crop?.key || 'other', sellerId: user.id };
}

router.post('/', requireRole('farmer'), wrap((req, res) => {
  const l = { id: uid('lst'), views: 0, createdAt: nowIso(), ...build(req.body, req.user), updatedAt: nowIso() };
  db().listings.unshift(l);
  if (l.status === 'active') notify(req.user.id, 'listingPublished', { crop: l.cropName }, `/crop/${l.id}`);
  res.status(201).json(viewListing(l));
}));

function owned(req) {
  const l = db().listings.find((x) => x.id === req.params.id);
  if (!l) throw notFound();
  if (l.sellerId !== req.user.id) throw forbidden(); // ownership check
  return l;
}

router.put('/:id', requireRole('farmer'), wrap((req, res) => {
  const l = owned(req);
  const body = { ...req.body, status: req.body.status ?? l.status };
  const next = build(body, req.user, l);
  Object.assign(l, next, { updatedAt: nowIso(), endingNotified: false });
  if (l.status === 'active' && req.body.status === 'active' && l.createdAt === l.updatedAt) notify(req.user.id, 'listingPublished', { crop: l.cropName }, `/crop/${l.id}`);
  res.json(viewListing(l));
}));

const STATUS_TRANSITIONS = { draft: ['active'], active: ['paused', 'sold'], paused: ['active', 'sold'], sold: ['active'] };
router.patch('/:id/status', requireRole('farmer'), wrap((req, res) => {
  const l = owned(req);
  const to = req.body.status;
  if (!(STATUS_TRANSITIONS[l.status] || []).includes(to)) throw conflict('badState');
  if (to === 'active') {
    const { ok, errors } = validateListing(l);
    if (!ok) throw bad(errors); // publishing requires a complete listing
    if (l.quantity <= 0) throw bad({ quantity: 'positive' });
    if (l.status === 'draft') notify(req.user.id, 'listingPublished', { crop: l.cropName }, `/crop/${l.id}`);
  }
  l.status = to;
  l.updatedAt = nowIso();
  res.json(viewListing(l));
}));

router.delete('/:id', requireRole('farmer'), wrap((req, res) => {
  const l = owned(req);
  const d = db();
  if (d.orders.some((o) => o.listingId === l.id && OPEN_STATUSES.includes(o.status))) throw conflict('hasOpenOrders');
  d.offers.filter((o) => o.listingId === l.id && ['pending', 'countered'].includes(o.status)).forEach((o) => {
    o.status = 'expired';
    o.history.push({ type: 'expire', by: 'system', at: nowIso(), reason: 'listingRemoved' });
  });
  d.listings = d.listings.filter((x) => x.id !== l.id);
  res.json({ ok: true, today: dateOnly() });
}));
