// Transparent, deterministic buyer–listing matching. No ML is used or claimed.
// To plug in a real AI service later, implement `externalRecommend(criteria, listings)` returning
// [{ listingId, score, reasons }] and set RECOMMENDER_URL; this module will call it with a timeout
// and fall back to the deterministic scorer on any failure.
import { baseUnit, toBase, basePrice } from '../../shared/units.js';
import { districtDistanceKm } from '../../shared/geo.js';

export function scoreListing(l, c) {
  let score = 0;
  const reasons = [];
  const miss = [];
  if (c.crops?.length) {
    if (c.crops.includes(l.cropKey)) { score += 40; reasons.push('crop'); } else miss.push('crop');
  }
  if (c.districts?.length) {
    if (c.districts.includes(l.district)) { score += 20; reasons.push('district'); }
    else {
      const near = Math.min(...c.districts.map((d) => districtDistanceKm(d, l.district) ?? 9999));
      if (near <= 150) { score += 8; reasons.push('nearDistrict'); } else miss.push('district');
    }
  }
  if (c.quantity > 0) {
    const need = toBase(c.quantity, c.quantityUnit || 'kg');
    if (toBase(l.quantity, l.quantityUnit) >= need) { score += 15; reasons.push('quantity'); } else miss.push('quantity');
    if (toBase(l.minOrder, l.quantityUnit) <= need) { score += 10; reasons.push('minOrder'); } else miss.push('minOrder');
  }
  if (c.budget > 0) {
    if (basePrice(l.price, l.priceUnit) <= c.budget) { score += 10; reasons.push('budget'); } else miss.push('budget');
  }
  if (c.fulfilment && l.fulfilment.includes(c.fulfilment)) { score += 5; reasons.push('fulfilment'); }
  else if (c.fulfilment) miss.push('fulfilment');
  return { score, reasons, miss };
}

export function recommend(criteria, listings) {
  return listings
    .filter((l) => l.status === 'active')
    .map((l) => ({ listing: l, ...scoreListing(l, criteria) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
}
export const RECOMMENDER = { type: 'deterministic-rules', ml: false, externalConfigured: !!process.env.RECOMMENDER_URL };
