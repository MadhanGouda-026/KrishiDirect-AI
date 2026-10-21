export const CATEGORIES = [
  { key: 'vegetables', emoji: '🍅', color: '#E94B35', bg: '#FDE7E2' },
  { key: 'fruits', emoji: '🍌', color: '#B88300', bg: '#FFF3D1' },
  { key: 'grains', emoji: '🌾', color: '#A67C00', bg: '#FBF1CF' },
  { key: 'pulses', emoji: '🫘', color: '#8A4B2A', bg: '#F4E4D8' },
  { key: 'spices', emoji: '🌶️', color: '#C2331B', bg: '#FCE1DB' },
  { key: 'arecanut', emoji: '🌴', color: '#7A4E1D', bg: '#F1E3D0' },
  { key: 'coconut', emoji: '🥥', color: '#5E4524', bg: '#EFE5D8' },
  { key: 'flowers', emoji: '🌼', color: '#D98200', bg: '#FFEFCC' },
  { key: 'leafy', emoji: '🥬', color: '#1F7A38', bg: '#E1F3DF' },
  { key: 'oilseeds', emoji: '🥜', color: '#9A6A12', bg: '#F6EBCF' },
  { key: 'other', emoji: '🧺', color: '#647568', bg: '#E8EEE9' },
];
export const CATEGORY_KEYS = CATEGORIES.map((c) => c.key);
export const categoryByKey = (k) => CATEGORIES.find((c) => c.key === k) || CATEGORIES[CATEGORIES.length - 1];

// Crop catalogue used for aliases, search (English/Kannada/Hindi) and illustrations.
export const CROPS = [
  { key: 'tomato', cat: 'vegetables', emoji: '🍅', en: 'Tomato', kn: 'ಟೊಮೆಟೊ', hi: 'टमाटर', aliases: ['tamatar', 'tomatoes', 'ಟೊಮ್ಯಾಟೊ'] },
  { key: 'onion', cat: 'vegetables', emoji: '🧅', en: 'Onion', kn: 'ಈರುಳ್ಳಿ', hi: 'प्याज़', aliases: ['pyaz', 'eerulli', 'onions', 'प्याज'] },
  { key: 'potato', cat: 'vegetables', emoji: '🥔', en: 'Potato', kn: 'ಆಲೂಗಡ್ಡೆ', hi: 'आलू', aliases: ['aloo', 'batata', 'potatoes'] },
  { key: 'brinjal', cat: 'vegetables', emoji: '🍆', en: 'Brinjal', kn: 'ಬದನೆಕಾಯಿ', hi: 'बैंगन', aliases: ['eggplant', 'baingan', 'badanekai'] },
  { key: 'chilli', cat: 'spices', emoji: '🌶️', en: 'Chilli', kn: 'ಮೆಣಸಿನಕಾಯಿ', hi: 'मिर्च', aliases: ['chili', 'chillies', 'mirchi', 'menasinakayi', 'green chilli'] },
  { key: 'turmeric', cat: 'spices', emoji: '🟡', en: 'Turmeric', kn: 'ಅರಿಶಿನ', hi: 'हल्दी', aliases: ['haldi', 'arishina'] },
  { key: 'pepper', cat: 'spices', emoji: '⚫', en: 'Black pepper', kn: 'ಕಾಳುಮೆಣಸು', hi: 'काली मिर्च', aliases: ['pepper', 'kali mirch', 'kalu menasu'] },
  { key: 'cardamom', cat: 'spices', emoji: '🫛', en: 'Cardamom', kn: 'ಏಲಕ್ಕಿ', hi: 'इलायची', aliases: ['elaichi', 'yalakki'] },
  { key: 'coconut', cat: 'coconut', emoji: '🥥', en: 'Coconut', kn: 'ತೆಂಗಿನಕಾಯಿ', hi: 'नारियल', aliases: ['tengina kayi', 'nariyal', 'copra', 'ತೆಂಗು'] },
  { key: 'arecanut', cat: 'arecanut', emoji: '🌴', en: 'Arecanut', kn: 'ಅಡಿಕೆ', hi: 'सुपारी', aliases: ['areca', 'adike', 'supari', 'betel nut', 'areca nut'] },
  { key: 'rice', cat: 'grains', emoji: '🌾', en: 'Rice', kn: 'ಅಕ್ಕಿ', hi: 'चावल', aliases: ['paddy', 'bhatta', 'akki', 'chawal', 'ಭತ್ತ'] },
  { key: 'ragi', cat: 'grains', emoji: '🌾', en: 'Ragi', kn: 'ರಾಗಿ', hi: 'रागी', aliases: ['finger millet', 'nachni'] },
  { key: 'maize', cat: 'grains', emoji: '🌽', en: 'Maize', kn: 'ಮೆಕ್ಕೆಜೋಳ', hi: 'मक्का', aliases: ['corn', 'makka', 'mekkejola'] },
  { key: 'banana', cat: 'fruits', emoji: '🍌', en: 'Banana', kn: 'ಬಾಳೆಹಣ್ಣು', hi: 'केला', aliases: ['kela', 'balehannu', 'yelakki', 'nendran', 'plantain'] },
  { key: 'mango', cat: 'fruits', emoji: '🥭', en: 'Mango', kn: 'ಮಾವಿನಹಣ್ಣು', hi: 'आम', aliases: ['aam', 'mavinahannu', 'totapuri', 'alphonso'] },
  { key: 'jackfruit', cat: 'other', emoji: '🍈', en: 'Jackfruit', kn: 'ಹಲಸು', hi: 'कटहल', aliases: ['halasu', 'kathal'] },
  { key: 'toor', cat: 'pulses', emoji: '🫘', en: 'Toor dal (pigeon pea)', kn: 'ತೊಗರಿ', hi: 'अरहर', aliases: ['tur', 'arhar', 'togari', 'pigeon pea', 'toor'] },
  { key: 'greengram', cat: 'pulses', emoji: '🫛', en: 'Green gram', kn: 'ಹೆಸರುಕಾಳು', hi: 'मूंग', aliases: ['moong', 'mung', 'hesaru'] },
  { key: 'marigold', cat: 'flowers', emoji: '🌼', en: 'Marigold', kn: 'ಚೆಂಡು ಹೂವು', hi: 'गेंदा', aliases: ['genda', 'chendu hoovu', 'flower'] },
  { key: 'jasmine', cat: 'flowers', emoji: '🤍', en: 'Jasmine', kn: 'ಮಲ್ಲಿಗೆ', hi: 'चमेली', aliases: ['mallige', 'chameli'] },
  { key: 'spinach', cat: 'leafy', emoji: '🥬', en: 'Spinach', kn: 'ಪಾಲಕ್', hi: 'पालक', aliases: ['palak', 'palya', 'leafy greens'] },
  { key: 'coriander', cat: 'leafy', emoji: '🌿', en: 'Coriander', kn: 'ಕೊತ್ತಂಬರಿ', hi: 'धनिया', aliases: ['dhania', 'kothambari', 'cilantro'] },
  { key: 'groundnut', cat: 'oilseeds', emoji: '🥜', en: 'Groundnut', kn: 'ಕಡಲೆಕಾಯಿ', hi: 'मूंगफली', aliases: ['peanut', 'moongphali', 'kadlekai'] },
  { key: 'sunflower', cat: 'oilseeds', emoji: '🌻', en: 'Sunflower', kn: 'ಸೂರ್ಯಕಾಂತಿ', hi: 'सूरजमुखी', aliases: ['suryakanti', 'surajmukhi'] },
];
export const cropByKey = (k) => CROPS.find((c) => c.key === k);
const norm = (s) => String(s || '').toLowerCase().trim();
const names = (c) => [c.en, c.kn, c.hi, ...c.aliases].map(norm);
/** Best-effort catalogue match for a free-text crop name. */
export function findCrop(name) {
  const n = norm(name);
  if (!n) return null;
  return CROPS.find((c) => names(c).some((x) => x && (n.includes(x) || (n.length >= 3 && x.includes(n))))) || null;
}
/** Search match: free text vs listing, aware of English/Kannada/Hindi names and aliases. */
export function matchesQuery(listing, q, districtName = '') {
  const s = norm(q);
  if (!s) return true;
  const blob = norm(`${listing.cropName} ${listing.village || ''} ${districtName} ${listing.description || ''}`);
  if (blob.includes(s)) return true;
  return CROPS.some((c) => c.key === listing.cropKey && names(c).some((x) => x.includes(s)));
}
export const localName = (item, lang) => (item && (item[lang === 'tu' ? 'kn' : lang] || item.en)) || '';
