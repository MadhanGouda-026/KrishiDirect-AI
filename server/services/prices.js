// Price provider abstraction.
// A real provider must implement: meta(), markets(), cropKeys(), series(cropKey) ->
//   { unit, markets: { [marketKey]: [[YYYY-MM-DD, price], ...] } }
// Configure with PRICE_PROVIDER (default "demo") plus provider-specific variables
// (e.g. PRICE_API_URL, PRICE_API_KEY). Only the demo provider ships with this MVP; any other value
// falls back to demo and the API keeps reporting live:false so the UI never claims live data.
import { db } from '../db.js';

const demoProvider = {
  meta: () => db().prices.meta,
  markets: () => db().prices.markets,
  cropKeys: () => Object.keys(db().prices.crops),
  series: (k) => db().prices.crops[k] || null,
};
export function provider() {
  const want = process.env.PRICE_PROVIDER || 'demo';
  if (want !== 'demo' && !provider.warned) {
    provider.warned = true;
    console.warn(`PRICE_PROVIDER="${want}" is not implemented in this MVP; using demo data.`);
  }
  return demoProvider;
}

const avg = (a) => a.reduce((s, x) => s + x, 0) / (a.length || 1);
const q = (sorted, p) => sorted[Math.min(sorted.length - 1, Math.floor(p * (sorted.length - 1)))];

export function latestAvg(cropKey) {
  const s = provider().series(cropKey);
  if (!s) return null;
  const last = Object.values(s.markets).map((m) => m[m.length - 1][1]);
  return { unit: s.unit, price: Math.round(avg(last) * 10) / 10, date: Object.values(s.markets)[0].at(-1)[0] };
}

export function summary() {
  const p = provider();
  return p.cropKeys().map((key) => {
    const s = p.series(key);
    const markets = Object.values(s.markets);
    const n = markets[0].length;
    const dayAvg = (i) => avg(markets.map((m) => m[i][1]));
    const now = avg([0, 1, 2].map((i) => dayAvg(n - 1 - i)));
    const prev = avg([7, 8, 9].map((i) => dayAvg(n - 1 - i)));
    const all = markets.flatMap((m) => m.map((x) => x[1]));
    return {
      key, unit: s.unit, price: Math.round(now * 10) / 10, change7d: Math.round(((now - prev) / prev) * 1000) / 10,
      min: Math.min(...all), max: Math.max(...all),
    };
  });
}

export function suggestedRange(cropKey) {
  const s = provider().series(cropKey);
  if (!s) return null;
  const vals = Object.values(s.markets).flatMap((m) => m.slice(-14).map((x) => x[1])).sort((a, b) => a - b);
  if (vals.length < 14) return null;
  return {
    unit: s.unit, low: Math.round(q(vals, 0.25) * 10) / 10, high: Math.round(q(vals, 0.75) * 10) / 10,
    basis: 'Middle 50% of the last 14 days of DEMO reference prices across sample markets. Reference only — not advice or a forecast.',
  };
}
