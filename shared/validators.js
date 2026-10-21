// Single source of truth for validation. Used by the React forms (inline errors) and by the
// Express API (authoritative). Errors are short codes translated on the client: t('val.<code>').
import { CATEGORY_KEYS } from './crops.js';
import { DISTRICT_KEYS } from './geo.js';
import { UNIT_KEYS, sameGroup, convert } from './units.js';

export const GRADES = ['A', 'B', 'C', 'ungraded'];
export const FULFILMENT = ['pickup', 'delivery'];
export const ORGANIC = ['organic', 'conventional'];
export const CONTACT_PREFS = ['enquiry', 'offer', 'both'];
export const LISTING_STATUSES = ['draft', 'active', 'paused', 'sold'];
export const MAX_IMAGES = 3;
export const MAX_IMAGE_CHARS = 450000; // ~330 KB binary as base64
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const today = () => new Date().toISOString().slice(0, 10);
const addDays = (d, n) => new Date(new Date(d).getTime() + n * 864e5).toISOString().slice(0, 10);
const empty = (v) => v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);

export function validImage(s) {
  if (typeof s !== 'string' || !s) return 'imageInvalid';
  if (/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(s)) return s.length > MAX_IMAGE_CHARS ? 'imageTooLarge' : null;
  if (/^https?:\/\/[^\s]{3,500}$/.test(s)) return null;
  return 'imageInvalid';
}

export function validateListing(d = {}, { draft = false } = {}) {
  const e = {};
  const v = {};
  v.cropName = String(d.cropName ?? '').trim();
  if (!v.cropName) e.cropName = 'required';
  else if (v.cropName.length < 2) e.cropName = 'tooShort';
  else if (v.cropName.length > 60) e.cropName = 'tooLong';

  v.category = d.category;
  if (!CATEGORY_KEYS.includes(v.category)) e.category = 'required';

  v.description = String(d.description ?? '').trim();
  if (v.description.length > 800) e.description = 'tooLong';

  v.price = Number(d.price);
  if (empty(d.price)) e.price = 'required';
  else if (!(v.price > 0)) e.price = 'positive';
  else if (v.price > 1e6) e.price = 'tooLarge';

  v.priceUnit = d.priceUnit;
  if (!UNIT_KEYS.includes(v.priceUnit)) e.priceUnit = 'required';
  v.quantityUnit = d.quantityUnit;
  if (!UNIT_KEYS.includes(v.quantityUnit)) e.quantityUnit = 'required';
  else if (!e.priceUnit && !sameGroup(v.priceUnit, v.quantityUnit)) e.quantityUnit = 'unitMismatch';

  v.quantity = Number(d.quantity);
  if (empty(d.quantity)) e.quantity = 'required';
  else if (!(v.quantity > 0)) e.quantity = 'positive';
  else if (v.quantity > 1e7) e.quantity = 'tooLarge';

  v.minOrder = Number(d.minOrder);
  if (empty(d.minOrder)) e.minOrder = 'required';
  else if (!(v.minOrder > 0)) e.minOrder = 'positive';
  else if (!e.quantity && !e.quantityUnit && v.minOrder > v.quantity) e.minOrder = 'minOrderTooHigh';

  v.grade = d.grade;
  if (!GRADES.includes(v.grade)) e.grade = 'required';

  v.harvestDate = d.harvestDate;
  if (empty(d.harvestDate)) e.harvestDate = 'required';
  else if (!DATE_RE.test(d.harvestDate) || isNaN(new Date(d.harvestDate))) e.harvestDate = 'dateInvalid';
  else if (d.harvestDate > addDays(today(), 1)) e.harvestDate = 'dateFuture';
  else if (d.harvestDate < addDays(today(), -365)) e.harvestDate = 'dateOld';

  v.district = d.district;
  if (!DISTRICT_KEYS.includes(v.district)) e.district = 'required';
  v.village = String(d.village ?? '').trim();
  if (v.village.length > 80) e.village = 'tooLong';

  v.fulfilment = Array.isArray(d.fulfilment) ? [...new Set(d.fulfilment.filter((x) => FULFILMENT.includes(x)))] : [];
  if (!v.fulfilment.length) e.fulfilment = 'pickOne';

  v.organic = d.organic;
  if (!ORGANIC.includes(v.organic)) e.organic = 'required';

  v.images = (Array.isArray(d.images) ? d.images : d.image ? [d.image] : []).filter((x) => !empty(x));
  if (v.images.length > MAX_IMAGES) e.images = 'tooManyImages';
  else for (const im of v.images) { const c = validImage(im); if (c) { e.images = c; break; } }

  v.contactPref = d.contactPref || 'both';
  if (!CONTACT_PREFS.includes(v.contactPref)) e.contactPref = 'invalid';

  v.availableUntil = empty(d.availableUntil) ? '' : d.availableUntil;
  if (v.availableUntil && (!DATE_RE.test(v.availableUntil) || v.availableUntil < today())) e.availableUntil = 'dateInvalid';

  v.status = LISTING_STATUSES.includes(d.status) ? d.status : draft ? 'draft' : 'active';

  if (draft) {
    // Drafts only need a crop name; anything else that was provided must still be valid.
    for (const k of Object.keys(e)) if (k !== 'cropName' && (empty(d[k]) || e[k] === 'required')) delete e[k];
    if (!CATEGORY_KEYS.includes(v.category)) v.category = 'other';
  }
  return { ok: Object.keys(e).length === 0, errors: e, value: v };
}

/** Offer / order request checks against a listing. */
export function validateRequest({ price, quantity, method, note }, listing, { needPrice = false, needMethod = false } = {}) {
  const e = {};
  const q = Number(quantity);
  if (empty(quantity)) e.quantity = 'required';
  else if (!(q > 0)) e.quantity = 'positive';
  else {
    if (q < listing.minOrder) e.quantity = 'belowMinOrder';
    else if (q > listing.quantity) e.quantity = 'exceedsStock';
  }
  if (needPrice) {
    const p = Number(price);
    if (empty(price)) e.price = 'required';
    else if (!(p > 0)) e.price = 'positive';
    else if (p > 1e6) e.price = 'tooLarge';
  }
  if (needMethod && !(listing.fulfilment || []).includes(method)) e.method = 'methodUnavailable';
  if (note && String(note).length > 300) e.note = 'tooLong';
  return { ok: !Object.keys(e).length, errors: e };
}
export const inUnit = (q, listing, unit) => convert(q, listing.quantityUnit, unit);
