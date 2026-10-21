// Karnataka district centres — APPROXIMATE coordinates used only for rough straight-line distances.
export const DISTRICTS = [
  { key: 'udupi', en: 'Udupi', kn: 'ಉಡುಪಿ', hi: 'उडुपी', lat: 13.34, lng: 74.75 },
  { key: 'uttara_kannada', en: 'Uttara Kannada', kn: 'ಉತ್ತರ ಕನ್ನಡ', hi: 'उत्तर कन्नड़', lat: 14.8, lng: 74.13 },
  { key: 'dakshina_kannada', en: 'Dakshina Kannada', kn: 'ದಕ್ಷಿಣ ಕನ್ನಡ', hi: 'दक्षिण कन्नड़', lat: 12.91, lng: 74.86 },
  { key: 'shivamogga', en: 'Shivamogga', kn: 'ಶಿವಮೊಗ್ಗ', hi: 'शिवमोग्गा', lat: 13.93, lng: 75.57 },
  { key: 'chikkamagaluru', en: 'Chikkamagaluru', kn: 'ಚಿಕ್ಕಮಗಳೂರು', hi: 'चिक्कमगलुरु', lat: 13.32, lng: 75.77 },
  { key: 'hassan', en: 'Hassan', kn: 'ಹಾಸನ', hi: 'हासन', lat: 13.0, lng: 76.1 },
  { key: 'mysuru', en: 'Mysuru', kn: 'ಮೈಸೂರು', hi: 'मैसूरु', lat: 12.3, lng: 76.65 },
  { key: 'bengaluru_rural', en: 'Bengaluru Rural', kn: 'ಬೆಂಗಳೂರು ಗ್ರಾಮಾಂತರ', hi: 'बेंगलुरु ग्रामीण', lat: 13.29, lng: 77.54 },
  { key: 'bengaluru_urban', en: 'Bengaluru Urban', kn: 'ಬೆಂಗಳೂರು ನಗರ', hi: 'बेंगलुरु शहरी', lat: 12.97, lng: 77.59 },
  { key: 'belagavi', en: 'Belagavi', kn: 'ಬೆಳಗಾವಿ', hi: 'बेलगावी', lat: 15.85, lng: 74.5 },
  { key: 'dharwad', en: 'Dharwad', kn: 'ಧಾರವಾಡ', hi: 'धारवाड़', lat: 15.46, lng: 75.01 },
  { key: 'tumakuru', en: 'Tumakuru', kn: 'ತುಮಕೂರು', hi: 'तुमकुरु', lat: 13.34, lng: 77.1 },
  { key: 'mandya', en: 'Mandya', kn: 'ಮಂಡ್ಯ', hi: 'मांड्या', lat: 12.52, lng: 76.9 },
  { key: 'kodagu', en: 'Kodagu', kn: 'ಕೊಡಗು', hi: 'कोडागु', lat: 12.42, lng: 75.74 },
  { key: 'davanagere', en: 'Davanagere', kn: 'ದಾವಣಗೆರೆ', hi: 'दावणगेरे', lat: 14.47, lng: 75.92 },
];
export const DISTRICT_KEYS = DISTRICTS.map((d) => d.key);
export const districtByKey = (k) => DISTRICTS.find((d) => d.key === k);

export function haversineKm(a, b) {
  const R = 6371;
  const rad = (x) => (x * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
/** Approximate straight-line distance between district centres (km). null if unknown. */
export function districtDistanceKm(a, b) {
  const da = districtByKey(a);
  const db = districtByKey(b);
  if (!da || !db) return null;
  return Math.round(haversineKm(da, db));
}
/** Transparent, configurable transport estimate. Not a quote. */
export const TRANSPORT_DEFAULTS = { ratePerKm: 12, minCharge: 300, roadFactor: 1.3 };
export function transportEstimate(straightKm, cfg = TRANSPORT_DEFAULTS) {
  if (straightKm == null) return null;
  const roadKm = Math.round(straightKm * cfg.roadFactor);
  const cost = Math.max(cfg.minCharge, Math.round(roadKm * cfg.ratePerKm));
  return { straightKm, approxRoadKm: roadKm, cost, assumptions: cfg };
}
