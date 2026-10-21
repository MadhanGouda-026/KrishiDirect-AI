import { db } from '../db.js';
import { uid, nowIso, HttpError } from '../util.js';
import { subtotal, round2 } from '../../shared/units.js';
import { districtByKey, districtDistanceKm, transportEstimate, TRANSPORT_DEFAULTS } from '../../shared/geo.js';

export const OPEN_STATUSES = ['placed', 'confirmed', 'prepared', 'dispatched', 'ready_for_pickup'];

// action -> { from: [statuses], actor: 'seller'|'buyer', to: status | fn(order) }
export const ORDER_TRANSITIONS = {
  confirm: { from: ['placed'], actor: 'seller', to: 'confirmed' },
  reject: { from: ['placed'], actor: 'seller', to: 'rejected' },
  prepare: { from: ['confirmed'], actor: 'seller', to: 'prepared' },
  dispatch: { from: ['prepared'], actor: 'seller', to: (o) => (o.method === 'pickup' ? 'ready_for_pickup' : 'dispatched') },
  receive: { from: ['dispatched', 'ready_for_pickup'], actor: 'buyer', to: 'received' },
  cancel: { from: ['placed', 'confirmed'], actor: 'buyer', to: 'cancelled' }, // not after preparation starts
};

const transportCfg = () => ({
  ratePerKm: Number(process.env.TRANSPORT_RATE_PER_KM || TRANSPORT_DEFAULTS.ratePerKm),
  minCharge: Number(process.env.TRANSPORT_MIN_CHARGE || TRANSPORT_DEFAULTS.minCharge),
  roadFactor: Number(process.env.TRANSPORT_ROAD_FACTOR || TRANSPORT_DEFAULTS.roadFactor),
});
export const estimateTransport = (fromDistrict, toDistrict) =>
  transportEstimate(districtDistanceKm(fromDistrict, toDistrict), transportCfg());

function nextRef() {
  const d = db();
  d.counters.order = (d.counters.order || 1000) + 1;
  return `KD-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${d.counters.order}`;
}

/** Reserves stock and creates a DEMO order (no payment of any kind is processed). */
export function createOrder({ listing, buyer, quantity, method, note = '', price, offerId = null, status = 'placed' }) {
  const unitPrice = price ?? listing.price;
  if (quantity > listing.quantity) throw new HttpError(409, 'exceedsStock');
  listing.quantity = round2(listing.quantity - quantity);
  if (listing.quantity <= 0) { listing.quantity = 0; listing.status = 'sold'; }
  const seller = db().users.find((u) => u.id === listing.sellerId);
  const at = nowIso();
  const order = {
    id: uid('ord'), ref: nextRef(), listingId: listing.id, cropName: listing.cropName, cropKey: listing.cropKey,
    sellerId: seller.id, sellerName: seller.name, buyerId: buyer.id, buyerName: buyer.name,
    quantity, quantityUnit: listing.quantityUnit, price: unitPrice, priceUnit: listing.priceUnit,
    subtotal: subtotal(unitPrice, listing.priceUnit, quantity, listing.quantityUnit), method,
    pickupLocation: `${listing.village ? listing.village + ', ' : ''}${districtByKey(listing.district)?.en || listing.district}`,
    transport: method === 'delivery' ? estimateTransport(buyer.district, listing.district) : null,
    note, offerId, status, demo: true,
    timeline: [{ status, at, by: status === 'placed' ? buyer.id : seller.id }], createdAt: at, updatedAt: at,
  };
  db().orders.unshift(order);
  return order;
}

export function restoreStock(order) {
  const l = db().listings.find((x) => x.id === order.listingId);
  if (!l) return;
  l.quantity = round2(l.quantity + order.quantity);
  if (l.status === 'sold' && l.quantity > 0) l.status = 'active';
}
