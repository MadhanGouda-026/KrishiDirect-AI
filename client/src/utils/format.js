const LOCALES = { en: 'en-IN', kn: 'kn-IN', hi: 'hi-IN', tu: 'kn-IN' };
export const loc = (lang) => LOCALES[lang] || 'en-IN';
export const inr = (n, lang = 'en', max = 2) =>
  new Intl.NumberFormat(loc(lang), { style: 'currency', currency: 'INR', maximumFractionDigits: max }).format(Number(n) || 0);
export const num = (n, lang = 'en', max = 1) => new Intl.NumberFormat(loc(lang), { maximumFractionDigits: max }).format(Number(n) || 0);
export const fmtDate = (d, lang = 'en') => (d ? new Date(d).toLocaleDateString(loc(lang), { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
export const fmtDateTime = (d, lang = 'en') => (d ? new Date(d).toLocaleString(loc(lang), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');
export function ago(d, t) {
  const m = Math.round((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return t('time.now');
  if (m < 60) return t('time.minutes', { n: m });
  if (m < 1440) return t('time.hours', { n: Math.round(m / 60) });
  return t('time.days', { n: Math.round(m / 1440) });
}
export const today = () => new Date().toISOString().slice(0, 10);
