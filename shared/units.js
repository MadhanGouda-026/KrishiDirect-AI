// Unit helpers shared by client and server. Weight units convert to kg, count units to piece.
export const UNITS = {
  kg: { group: 'w', f: 1 },
  quintal: { group: 'w', f: 100 },
  tonne: { group: 'w', f: 1000 },
  piece: { group: 'c', f: 1 },
  dozen: { group: 'c', f: 12 },
};
export const UNIT_KEYS = Object.keys(UNITS);
export const sameGroup = (a, b) => !!UNITS[a] && !!UNITS[b] && UNITS[a].group === UNITS[b].group;
export const convert = (q, from, to) => (q * UNITS[from].f) / UNITS[to].f;
export const baseUnit = (u) => (UNITS[u]?.group === 'c' ? 'piece' : 'kg');
export const toBase = (q, u) => q * UNITS[u].f;
/** price per base unit (₹/kg or ₹/piece) */
export const basePrice = (price, unit) => price / UNITS[unit].f;
export const round2 = (n) => Math.round(n * 100) / 100;
/** price is per priceUnit; qty is expressed in qtyUnit (same unit group) */
export const subtotal = (price, priceUnit, qty, qtyUnit) =>
  round2(price * convert(qty, qtyUnit, priceUnit));
