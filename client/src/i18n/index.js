import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import kn from './locales/kn.json';
import hi from './locales/hi.json';
import tu from './locales/tu.json';

export const LANGUAGES = ['en', 'kn', 'hi', 'tu'];
let saved = 'en';
try { saved = localStorage.getItem('kd_lang') || 'en'; } catch { /* ignore */ }

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, kn: { translation: kn }, hi: { translation: hi }, tu: { translation: tu } },
  lng: LANGUAGES.includes(saved) ? saved : 'en',
  // Tulu (written in Kannada script) falls back to Kannada, then English, until reviewed translations exist.
  fallbackLng: { tu: ['kn', 'en'], default: ['en'] },
  interpolation: { escapeValue: false },
  returnNull: false,
});
const apply = (lng) => {
  document.documentElement.lang = lng === 'tu' ? 'tcy' : lng;
  try { localStorage.setItem('kd_lang', lng); } catch { /* ignore */ }
};
apply(i18n.language);
i18n.on('languageChanged', apply);
export default i18n;
