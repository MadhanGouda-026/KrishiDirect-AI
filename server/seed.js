// Seed data. ALL of this is SAMPLE/DEMO data: names, prices, quantities and activity are fictional.
import { findCrop } from '../shared/crops.js';
import { districtByKey, districtDistanceKm, transportEstimate } from '../shared/geo.js';
import { subtotal } from '../shared/units.js';

const DAY = 864e5;
const ago = (days, hours = 0) => new Date(Date.now() - days * DAY - hours * 36e5).toISOString();
const dayStr = (days) => new Date(Date.now() - days * DAY).toISOString().slice(0, 10);

function mulberry(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const MARKETS = [
  { key: 'blr', name: 'Bengaluru region — sample market', factor: 1.06 },
  { key: 'mys', name: 'Mysuru region — sample market', factor: 1.0 },
  { key: 'hub', name: 'Hubballi–Dharwad region — sample market', factor: 0.95 },
  { key: 'mng', name: 'Mangaluru region — sample market', factor: 1.1 },
];
// Illustrative base values only (₹ per kg, or per piece for coconut). NOT market prices.
const PRICE_BASES = {
  tomato: 28, onion: 24, potato: 26, chilli: 42, banana: 45, mango: 32, coconut: 22, arecanut: 480,
  rice: 48, ragi: 38, turmeric: 115, pepper: 560, toor: 95, groundnut: 72, marigold: 50, spinach: 22,
};

function buildPrices() {
  const crops = {};
  let seedN = 7;
  for (const [key, base] of Object.entries(PRICE_BASES)) {
    const rnd = mulberry((seedN += 13));
    const phase = rnd() * 6;
    const markets = {};
    for (const m of MARKETS) {
      const series = [];
      for (let i = 89; i >= 0; i--) {
        const t = 89 - i;
        const wave = 0.12 * Math.sin(t / 9 + phase) + 0.05 * Math.sin(t / 3.3 + phase * 2);
        const noise = (rnd() - 0.5) * 0.04;
        const v = base * m.factor * (1 + wave + noise);
        series.push([dayStr(i), Math.round(v * 10) / 10]);
      }
      markets[m.key] = series;
    }
    crops[key] = { unit: key === 'coconut' ? 'piece' : 'kg', markets };
  }
  return {
    meta: {
      provider: 'demo',
      live: false,
      label: 'Demo Data — Not Live Market Prices',
      source: 'Synthetic sample series generated at seed time. Not sourced from any market, agency or API.',
      updatedAt: new Date().toISOString(),
    },
    markets: MARKETS.map(({ key, name }) => ({ key, name })),
    crops,
  };
}

export function buildSeed() {
  const users = [
    { id: 'f1', role: 'farmer', kind: 'individual', name: 'Ramesh Shetty', district: 'udupi', village: 'Brahmavara', crops: ['coconut', 'rice', 'jackfruit'], language: 'kn' },
    { id: 'f2', role: 'farmer', kind: 'individual', name: 'Lakshmi Hegde', district: 'uttara_kannada', village: 'Sirsi', crops: ['arecanut', 'pepper'], language: 'kn' },
    { id: 'f3', role: 'farmer', kind: 'individual', name: 'Shivanna Gowda', district: 'shivamogga', village: 'Thirthahalli', crops: ['tomato', 'chilli'], language: 'kn' },
    { id: 'f4', role: 'farmer', kind: 'fpo', name: 'Malnad Growers FPO', district: 'chikkamagaluru', village: 'Mudigere', crops: ['banana', 'turmeric', 'potato'], language: 'kn', demoVerified: true },
    { id: 'f5', role: 'farmer', kind: 'individual', name: 'Basavaraj Patil', district: 'belagavi', village: 'Gokak', crops: ['onion', 'groundnut', 'toor'], language: 'kn' },
    { id: 'f6', role: 'farmer', kind: 'individual', name: 'Kavitha Naik', district: 'mysuru', village: 'Hunsur', crops: ['ragi', 'marigold', 'mango'], language: 'kn' },
    { id: 'f7', role: 'farmer', kind: 'individual', name: 'Munirathna', district: 'bengaluru_rural', village: 'Doddaballapura', crops: ['spinach', 'coriander'], language: 'kn' },
    { id: 'b1', role: 'buyer', kind: 'retailer', name: 'Fresh Basket Retail', district: 'bengaluru_rural', prefs: { preferredCrops: ['tomato', 'spinach', 'banana'], preferredDistricts: ['shivamogga', 'bengaluru_rural', 'chikkamagaluru'] } },
    { id: 'b2', role: 'buyer', kind: 'hotel', name: 'Coastal Spice Hotel', district: 'dakshina_kannada', prefs: { preferredCrops: ['coconut', 'rice', 'chilli'], preferredDistricts: ['udupi', 'dakshina_kannada'] } },
    { id: 'b3', role: 'buyer', kind: 'wholesaler', name: 'Mysuru Wholesale Traders', district: 'mysuru', prefs: { preferredCrops: ['onion', 'potato', 'ragi'], preferredDistricts: ['belagavi', 'hassan', 'mysuru'] } },
    { id: 'b4', role: 'buyer', kind: 'cooperative', name: 'Dharwad Consumers Cooperative', district: 'dharwad', prefs: { preferredCrops: ['rice', 'toor', 'groundnut'], preferredDistricts: ['dharwad', 'belagavi'] } },
  ];
  const sellerName = (id) => users.find((u) => u.id === id).name;

  let n = 0;
  const L = (sellerId, cropName, category, p) => {
    n += 1;
    const seller = users.find((u) => u.id === sellerId);
    const crop = findCrop(cropName);
    return {
      id: `lst_${String(n).padStart(3, '0')}`,
      sellerId, cropName, cropKey: crop?.key || 'other', category,
      description: '', price: 0, priceUnit: 'kg', quantity: 0, quantityUnit: 'kg', minOrder: 10,
      grade: 'A', harvestDate: dayStr(2), district: seller.district, village: seller.village,
      fulfilment: ['pickup', 'delivery'], organic: 'conventional', images: [], contactPref: 'both',
      availableUntil: '', status: 'active', views: 10 + ((n * 37) % 90), createdAt: ago(n % 9, n), updatedAt: ago(n % 9, n),
      ...p,
    };
  };
  const listings = [
    L('f3', 'Tomato (hybrid, firm)', 'vegetables', { price: 26, quantity: 1500, minOrder: 100, description: 'Firm red hybrid tomatoes, sorted and crated. Harvested this week.', harvestDate: dayStr(1) }),
    L('f5', 'Onion (red, dry)', 'vegetables', { price: 22, priceUnit: 'kg', quantity: 40, quantityUnit: 'quintal', minOrder: 5, description: 'Cured red onions, medium to large size.', grade: 'B', harvestDate: dayStr(12) }),
    L('f1', 'Coconut (mature)', 'coconut', { price: 24, priceUnit: 'piece', quantity: 2000, quantityUnit: 'piece', minOrder: 200, description: 'Mature dehusked-on-request coconuts from our home plantation.', harvestDate: dayStr(4), organic: 'organic' }),
    L('f2', 'Arecanut (chali, dry)', 'arecanut', { price: 470, quantity: 600, minOrder: 50, description: 'Sun-dried arecanut, cleaned and graded.', harvestDate: dayStr(20), fulfilment: ['pickup'], availableUntil: dayStr(-2) }),
    L('f1', 'Rice (local red, unpolished)', 'grains', { price: 52, quantity: 30, quantityUnit: 'quintal', minOrder: 2, priceUnit: 'kg', organic: 'organic', description: 'Unpolished local red rice. Declared organic by the farmer (demo: not independently verified).', harvestDate: dayStr(30) }),
    L('f4', 'Banana (Yelakki)', 'fruits', { price: 48, quantity: 900, minOrder: 60, description: 'Small sweet Yelakki bananas, bunches cut to order.', harvestDate: dayStr(2) }),
    L('f3', 'Green chilli', 'spices', { price: 38, quantity: 300, minOrder: 20, grade: 'B', harvestDate: dayStr(1), description: 'Fresh green chillies, medium heat.' }),
    L('f6', 'Mango (Totapuri)', 'fruits', { price: 30, quantity: 1200, minOrder: 100, grade: 'B', harvestDate: dayStr(6), description: 'Totapuri mangoes suitable for pulp units and retail.' }),
    L('f6', 'Ragi (finger millet)', 'grains', { price: 36, quantity: 50, quantityUnit: 'quintal', minOrder: 5, organic: 'organic', harvestDate: dayStr(40), description: 'Cleaned ragi, declared organic by the farmer.' }),
    L('f4', 'Turmeric (dried fingers)', 'spices', { price: 120, quantity: 400, minOrder: 25, harvestDate: dayStr(25), description: 'Dried turmeric fingers, FPO-aggregated lot.' }),
    L('f2', 'Black pepper', 'spices', { price: 570, quantity: 120, minOrder: 10, harvestDate: dayStr(35), fulfilment: ['pickup', 'delivery'], description: 'Sun-dried black pepper from shade-grown vines.' }),
    L('f5', 'Toor dal (pigeon pea, whole)', 'pulses', { price: 95, quantity: 20, quantityUnit: 'quintal', minOrder: 2, harvestDate: dayStr(45), description: 'Cleaned whole toor, ready for milling.' }),
    L('f6', 'Marigold flowers', 'flowers', { price: 45, quantity: 200, minOrder: 10, harvestDate: dayStr(1), description: 'Fresh orange marigold, ideal for festival demand.' }),
    L('f7', 'Spinach (palak)', 'leafy', { price: 20, quantity: 150, minOrder: 10, harvestDate: dayStr(0), organic: 'organic', description: 'Tender spinach bundles, cut this morning.' }),
    L('f7', 'Coriander leaves', 'leafy', { price: 32, quantity: 90, minOrder: 5, harvestDate: dayStr(0), description: 'Fresh coriander, washed and tied.' }),
    L('f5', 'Groundnut (pods)', 'oilseeds', { price: 70, quantity: 25, quantityUnit: 'quintal', minOrder: 2, harvestDate: dayStr(18), description: 'Sun-dried groundnut pods.' }),
    L('f1', 'Jackfruit (raw, for curry)', 'other', { price: 20, quantity: 300, minOrder: 30, harvestDate: dayStr(3), description: 'Raw jackfruit, cut on request.' }),
    L('f4', 'Potato', 'vegetables', { price: 24, quantity: 60, quantityUnit: 'quintal', minOrder: 5, harvestDate: dayStr(10), grade: 'B', description: 'Table potatoes, uniform size.' }),
    L('f1', 'Cashew (raw nuts)', 'other', { price: 0, quantity: 0, minOrder: 0, status: 'draft', harvestDate: '', description: '', fulfilment: [], images: [] }),
  ];
  // Reflect stock already committed to seeded orders below.
  const byId = (id) => listings.find((l) => l.id === id);
  byId('lst_001').quantity -= 300; // seeded order
  byId('lst_006').quantity -= 120;

  const mkOrder = (num, listing, buyer, qty, method, status, price, offerId = null, daysBack = 1) => {
    const l = byId(listing);
    const b = users.find((u) => u.id === buyer);
    const km = districtDistanceKm(b.district, l.district);
    const steps = ['placed', 'confirmed', 'prepared', method === 'pickup' ? 'ready_for_pickup' : 'dispatched', 'received'];
    const reached = status === 'cancelled' || status === 'rejected' ? ['placed', status] : steps.slice(0, steps.indexOf(status) + 1);
    return {
      id: `ord_${num}`, ref: `KD-${dayStr(daysBack).slice(2).replace(/-/g, '')}-${1000 + num}`,
      listingId: l.id, cropName: l.cropName, cropKey: l.cropKey, sellerId: l.sellerId, sellerName: sellerName(l.sellerId),
      buyerId: b.id, buyerName: b.name, quantity: qty, quantityUnit: l.quantityUnit, price: price ?? l.price, priceUnit: l.priceUnit,
      subtotal: subtotal(price ?? l.price, l.priceUnit, qty, l.quantityUnit), method, pickupLocation: `${l.village}, ${districtByKey(l.district)?.en}`,
      transport: method === 'delivery' ? transportEstimate(km) : null, note: '', offerId, status, demo: true,
      timeline: reached.map((s, i) => ({ status: s, at: ago(daysBack, reached.length - i), by: ['placed', 'received', 'cancelled'].includes(s) ? b.id : l.sellerId })),
      createdAt: ago(daysBack, reached.length), updatedAt: ago(daysBack),
    };
  };
  const orders = [
    mkOrder(1, 'lst_001', 'b1', 300, 'delivery', 'dispatched', 25, 'off_003', 2),
    mkOrder(2, 'lst_006', 'b1', 120, 'pickup', 'placed', null, null, 0),
    mkOrder(3, 'lst_003', 'b2', 400, 'delivery', 'received', null, null, 6),
  ];
  // order 3 stock already reflected? coconut: reduce
  byId('lst_003').quantity -= 400;

  const offers = [
    { id: 'off_001', listingId: 'lst_007', buyerId: 'b1', buyerName: 'Fresh Basket Retail', sellerId: 'f3', price: 34, quantity: 100, note: 'Need weekly supply if quality holds.', status: 'pending', expiresAt: ago(-2), history: [{ type: 'offer', by: 'b1', price: 34, quantity: 100, note: 'Need weekly supply if quality holds.', at: ago(0, 5) }], createdAt: ago(0, 5), updatedAt: ago(0, 5) },
    { id: 'off_002', listingId: 'lst_005', buyerId: 'b4', buyerName: 'Dharwad Consumers Cooperative', sellerId: 'f1', price: 46, quantity: 5, note: '', status: 'countered', expiresAt: ago(-1), history: [{ type: 'offer', by: 'b4', price: 44, quantity: 5, note: '', at: ago(1, 4) }, { type: 'counter', by: 'f1', price: 46, quantity: 5, note: 'Can do 46 for 5 quintal, pickup only.', at: ago(0, 8) }], createdAt: ago(1, 4), updatedAt: ago(0, 8) },
    { id: 'off_003', listingId: 'lst_001', buyerId: 'b1', buyerName: 'Fresh Basket Retail', sellerId: 'f3', price: 25, quantity: 300, note: 'Bulk for weekend.', status: 'accepted', expiresAt: ago(-1), history: [{ type: 'offer', by: 'b1', price: 25, quantity: 300, note: 'Bulk for weekend.', at: ago(3) }, { type: 'accept', by: 'f3', at: ago(2, 12) }], createdAt: ago(3), updatedAt: ago(2, 12) },
  ];
  const threads = [
    { id: 'thr_001', listingId: 'lst_001', buyerId: 'b1', sellerId: 'f3', createdAt: ago(3, 2), messages: [
      { id: 'm1', by: 'b1', body: 'Is the tomato firm enough for 3-day transport to Bengaluru?', at: ago(3, 2), readBy: ['b1', 'f3'] },
      { id: 'm2', by: 'f3', body: 'Yes, harvested at firm-red stage and packed in crates.', at: ago(3, 1), readBy: ['b1', 'f3'] },
      { id: 'm3', by: 'b1', body: 'Great — can you hold 300 kg until Saturday?', at: ago(2, 20), readBy: ['b1'] },
    ] },
  ];
  const notifications = [
    { id: 'n1', userId: 'f3', type: 'offerNew', data: { crop: 'Green chilli', buyer: 'Fresh Basket Retail' }, link: '/offers', read: false, at: ago(0, 5) },
    { id: 'n2', userId: 'f1', type: 'offerNew', data: { crop: 'Rice (local red, unpolished)', buyer: 'Dharwad Consumers Cooperative' }, link: '/offers', read: true, at: ago(1, 4) },
    { id: 'n3', userId: 'b4', type: 'offerCountered', data: { crop: 'Rice (local red, unpolished)', price: 46 }, link: '/offers', read: false, at: ago(0, 8) },
    { id: 'n4', userId: 'b1', type: 'orderStatus', data: { ref: orders[0].ref, status: 'dispatched' }, link: '/orders', read: false, at: ago(1) },
    { id: 'n5', userId: 'f3', type: 'orderNew', data: { ref: orders[0].ref, buyer: 'Fresh Basket Retail' }, link: '/orders', read: true, at: ago(2, 12) },
    { id: 'n6', userId: 'f4', type: 'orderNew', data: { ref: orders[1].ref, buyer: 'Fresh Basket Retail' }, link: '/orders', read: false, at: ago(0, 1) },
    { id: 'n7', userId: 'f2', type: 'listingEnding', data: { crop: 'Arecanut (chali, dry)', date: dayStr(-2) }, link: '/sell/lst_004/edit', read: false, at: ago(0, 2) },
  ];

  return {
    version: 1, seededAt: new Date().toISOString(), counters: { order: 1003 },
    users, listings, offers, orders, threads, notifications, contacts: [], prices: buildPrices(),
  };
}
