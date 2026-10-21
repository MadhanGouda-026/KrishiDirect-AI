import { Router } from 'express';
import { db, resetDb } from '../db.js';
import { requireRole } from '../auth.js';
import { nowIso, uid, wrap, bad, notFound, dateOnly, HttpError } from '../util.js';
import { CATEGORY_KEYS } from '../../shared/crops.js';
import { DISTRICT_KEYS, DISTRICTS, districtDistanceKm } from '../../shared/geo.js';
import { toBase, baseUnit, basePrice } from '../../shared/units.js';
import * as prices from '../services/prices.js';
import { getWeather } from '../services/weather.js';
import { recommend, RECOMMENDER } from '../services/recommend.js';
import { runAssistant, underLimit, aiConfigured } from '../services/assistant.js';
import { viewListing } from './listings.js';
import { isExpiredListing } from '../domain/sweep.js';
import { TRANSPORT_DEFAULTS } from '../../shared/geo.js';

export const router = Router();
const wUnits = (l) => (baseUnit(l.quantityUnit) === 'kg' ? toBase(l.quantity, l.quantityUnit) : 0);
const activeListings = () => db().listings.filter((l) => l.status === 'active' && !isExpiredListing(l));

// ---------- meta / identities ----------
router.get('/meta', (_req, res) => {
  const p = prices.provider();
  res.json({
    demoMode: true, seededAt: db().seededAt, aiConfigured: aiConfigured(), recommender: RECOMMENDER,
    priceMeta: p.meta(), transportAssumptions: TRANSPORT_DEFAULTS,
    mapsConfigured: !!process.env.MAPS_API_KEY, weatherConfigured: false,
  });
});
router.get('/users', (_req, res) => res.json(db().users.map(({ id, role, kind, name, district, village, demoVerified, prefs, crops }) => ({ id, role, kind, name, district, village, demoVerified: !!demoVerified, prefs, crops }))));
router.get('/me', (req, res) => res.json(req.user));
router.put('/me/prefs', (req, res) => {
  const pc = Array.isArray(req.body.preferredCrops) ? req.body.preferredCrops.slice(0, 20).map(String) : [];
  const pd = (Array.isArray(req.body.preferredDistricts) ? req.body.preferredDistricts : []).filter((d) => DISTRICT_KEYS.includes(d));
  req.user.prefs = { preferredCrops: pc, preferredDistricts: pd };
  res.json(req.user.prefs);
});

// ---------- notifications ----------
router.get('/notifications', (req, res) => res.json(db().notifications.filter((n) => n.userId === req.user.id).slice(0, 100)));
router.post('/notifications/read-all', (req, res) => {
  db().notifications.forEach((n) => { if (n.userId === req.user.id) n.read = true; });
  res.json({ ok: true });
});
router.post('/notifications/:id/read', (req, res) => {
  const n = db().notifications.find((x) => x.id === req.params.id && x.userId === req.user.id);
  if (!n) throw notFound();
  n.read = true;
  res.json(n);
});

// ---------- prices (demo data service) ----------
router.get('/prices/summary', (_req, res) => res.json({ meta: prices.provider().meta(), markets: prices.provider().markets(), items: prices.summary() }));
router.get('/prices/:crop', (req, res) => {
  const s = prices.provider().series(req.params.crop);
  if (!s) throw notFound();
  const asks = activeListings().filter((l) => l.cropKey === req.params.crop).map((l) => ({ id: l.id, seller: db().users.find((u) => u.id === l.sellerId)?.name, district: l.district, price: l.price, priceUnit: l.priceUnit, basePrice: Math.round(basePrice(l.price, l.priceUnit) * 10) / 10 }));
  const openOffers = db().offers.filter((o) => ['pending', 'countered'].includes(o.status) && db().listings.find((l) => l.id === o.listingId)?.cropKey === req.params.crop).length;
  res.json({
    meta: prices.provider().meta(), markets: prices.provider().markets(), crop: req.params.crop, unit: s.unit, series: s.markets,
    suggested: prices.suggestedRange(req.params.crop), asks,
    supplyDemand: { activeListings: asks.length, availableKg: activeListings().filter((l) => l.cropKey === req.params.crop).reduce((a, l) => a + wUnits(l), 0), openOffers },
  });
});

// ---------- weather ----------
router.get('/weather', wrap(async (req, res) => res.json(await getWeather(req.query.district))));

// ---------- nearby markets (derived from app data; no official market locations) ----------
router.get('/markets', (req, res) => {
  const from = req.query.from || req.user.district;
  const act = activeListings();
  const out = DISTRICTS.map((d) => {
    const ls = act.filter((l) => l.district === d.key);
    const crops = [...new Set(ls.map((l) => l.cropName))].slice(0, 4);
    const buyers = db().users.filter((u) => u.role === 'buyer' && u.district === d.key).length;
    return { key: d.key, listings: ls.length, crops, buyers, distanceKm: districtDistanceKm(from, d.key) };
  });
  res.json({ from, approximate: true, items: out.sort((a, b) => (a.distanceKm ?? 9e9) - (b.distanceKm ?? 9e9)) });
});

// ---------- recommendations ----------
router.post('/recommendations', (req, res) => {
  const b = req.body || {};
  const c = {
    crops: Array.isArray(b.crops) ? b.crops : [], districts: Array.isArray(b.districts) ? b.districts : [],
    quantity: Number(b.quantity) || 0, quantityUnit: b.quantityUnit || 'kg', budget: Number(b.budget) || 0, fulfilment: b.fulfilment || '',
  };
  const items = recommend(c, db().listings).map((r) => ({ listing: viewListing(r.listing), score: r.score, reasons: r.reasons, miss: r.miss }));
  res.json({ method: RECOMMENDER, items });
});

// ---------- smart farming assistant ----------
router.post('/assistant', requireRole('farmer'), wrap(async (req, res) => {
  if (!underLimit(req.user.id)) throw new HttpError(429, 'rateLimited');
  const out = await runAssistant(req.body.tool, req.body.params || {});
  if (!out) throw bad({ tool: 'invalid' });
  res.json(out);
}));

// ---------- dashboards ----------
router.get('/dashboard/farmer', requireRole('farmer'), (req, res) => {
  const d = db();
  const mine = d.listings.filter((l) => l.sellerId === req.user.id);
  const act = mine.filter((l) => l.status === 'active');
  const offers = d.offers.filter((o) => o.sellerId === req.user.id);
  const orders = d.orders.filter((o) => o.sellerId === req.user.id);
  const threads = d.threads.filter((t) => t.sellerId === req.user.id);
  const perf = mine.map((l) => ({ id: l.id, cropName: l.cropName, views: l.views, offers: d.offers.filter((o) => o.listingId === l.id).length })).sort((a, b) => b.views + b.offers * 5 - (a.views + a.offers * 5));
  res.json({
    activeListings: act.length, totalListings: mine.length,
    availableKg: act.reduce((s, l) => s + wUnits(l), 0), availablePieces: act.filter((l) => baseUnit(l.quantityUnit) === 'piece').reduce((s, l) => s + toBase(l.quantity, l.quantityUnit), 0),
    enquiries: threads.length, unreadEnquiries: threads.filter((t) => t.messages.some((m) => m.by !== req.user.id && !m.readBy.includes(req.user.id))).length,
    pendingOffers: offers.filter((o) => o.status === 'pending').length, acceptedOffers: offers.filter((o) => o.status === 'accepted').length,
    orders: orders.length, ordersByStatus: count(orders, 'status'), offersByStatus: count(offers, 'status'),
    recentListings: [...mine].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5).map(viewListing),
    recentOffers: offers.slice(0, 5), best: mine.length >= 3 ? perf.slice(0, 3) : [],
    isSeedData: d.seededAt && Date.now() - new Date(d.seededAt) < 36e8,
  });
});
router.get('/dashboard/buyer', requireRole('buyer'), (req, res) => {
  const d = db();
  const offers = d.offers.filter((o) => o.buyerId === req.user.id);
  const orders = d.orders.filter((o) => o.buyerId === req.user.id);
  const threads = d.threads.filter((t) => t.buyerId === req.user.id);
  const activity = [
    ...offers.map((o) => ({ kind: 'offer', at: o.updatedAt, status: o.status, id: o.id, label: d.listings.find((l) => l.id === o.listingId)?.cropName })),
    ...orders.map((o) => ({ kind: 'order', at: o.updatedAt, status: o.status, id: o.id, label: o.cropName, ref: o.ref })),
  ].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 8);
  res.json({
    sentOffers: offers.length, pendingOffers: offers.filter((o) => o.status === 'pending').length, counters: offers.filter((o) => o.status === 'countered').length,
    orders: orders.length, ordersByStatus: count(orders, 'status'), openOrders: orders.filter((o) => !['received', 'rejected', 'cancelled'].includes(o.status)),
    enquiries: threads.length, prefs: req.user.prefs || { preferredCrops: [], preferredDistricts: [] }, activity,
  });
});
function count(arr, key) { const o = {}; arr.forEach((x) => { o[x[key]] = (o[x[key]] || 0) + 1; }); return o; }

// ---------- analytics (responds to filters) ----------
router.get('/analytics', (req, res) => {
  const { district, category } = req.query;
  const d = db();
  const ok = (l) => (!district || l.district === district) && (!category || l.category === category);
  const act = activeListings().filter(ok);
  const all = d.listings.filter((l) => l.status !== 'draft' && ok(l));
  const ids = new Set(all.map((l) => l.id));
  const by = (arr, f) => { const o = {}; arr.forEach((x) => { const k = f(x); o[k] = (o[k] || 0) + 1; }); return Object.entries(o).map(([key, value]) => ({ key, value })); };
  const buckets = [[0, 25], [25, 50], [50, 100], [100, 250], [250, 1e9]];
  const priceDistribution = buckets.map(([lo, hi]) => ({ key: hi > 1e8 ? `₹${lo}+` : `₹${lo}–${hi}`, value: act.filter((l) => { const b = basePrice(l.price, l.priceUnit); return b >= lo && b < hi; }).length }));
  const days = Array.from({ length: 14 }, (_, i) => dateOnly(new Date(Date.now() - (13 - i) * 864e5)));
  const qty = {};
  act.forEach((l) => { if (baseUnit(l.quantityUnit) === 'kg') qty[l.category] = (qty[l.category] || 0) + wUnits(l); });
  res.json({
    listingsByCategory: by(act, (l) => l.category), listingsByDistrict: by(act, (l) => l.district), priceDistribution,
    offersByStatus: by(d.offers.filter((o) => ids.has(o.listingId)), (o) => o.status),
    ordersByStatus: by(d.orders.filter((o) => ids.has(o.listingId)), (o) => o.status),
    activity: days.map((day) => ({ key: day.slice(5), value: all.filter((l) => l.createdAt.slice(0, 10) === day).length })),
    quantityByCategory: Object.entries(qty).map(([key, value]) => ({ key, value })),
    note: 'Quantities are in kg; count-based listings (pieces/dozens) are excluded from quantity totals.',
  });
});

// ---------- contact form ----------
router.post('/contact', (req, res) => {
  const { name, email, message } = req.body || {};
  const e = {};
  if (!String(name || '').trim()) e.name = 'required';
  if (!/^\S+@\S+\.\S+$/.test(String(email || ''))) e.email = 'invalid';
  if (String(message || '').trim().length < 10) e.message = 'tooShort';
  if (Object.keys(e).length) throw bad(e);
  db().contacts.push({ id: uid('c'), name: String(name).slice(0, 100), email: String(email).slice(0, 120), message: String(message).slice(0, 2000), at: nowIso() });
  res.status(201).json({ ok: true });
});

// ---------- demo ----------
router.post('/demo/reset', (_req, res) => {
  resetDb();
  res.json({ ok: true, seededAt: db().seededAt });
});
export { CATEGORY_KEYS };
