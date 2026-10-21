import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { localName, cropByKey, categoryByKey } from '@shared/crops.js';
import { districtByKey } from '@shared/geo.js';

export function usePageTitle(title) {
  useEffect(() => { document.title = title ? `${title} · KrishiDirect AI` : 'KrishiDirect AI — Sell Fresh. Earn Better.'; }, [title]);
}
/** Translation helpers for domain data. */
export function useNames() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  return {
    t, lang,
    district: (k) => (districtByKey(k) ? localName(districtByKey(k), lang) : k || ''),
    crop: (k) => (cropByKey(k) ? localName(cropByKey(k), lang) : k),
    cat: (k) => t(`cat.${k}`, { defaultValue: categoryByKey(k).key }),
    unit: (u) => t(`unit.${u}`, { defaultValue: u }),
    val: (code) => (code ? t(`val.${code}`, { defaultValue: code }) : undefined),
    valErrors: (fields) => Object.fromEntries(Object.entries(fields || {}).map(([k, c]) => [k, t(`val.${c}`, { defaultValue: c })])),
  };
}
