// Lazy housekeeping run on API requests: expire stale offers, warn about listings nearing end date.
import { db, save } from '../db.js';
import { notify } from './notify.js';
import { dateOnly } from '../util.js';

export const OFFER_TTL_HOURS = Number(process.env.OFFER_TTL_HOURS || 72);

export function sweep() {
  const d = db();
  let changed = false;
  const now = Date.now();
  for (const o of d.offers) {
    if (['pending', 'countered'].includes(o.status) && new Date(o.expiresAt).getTime() < now) {
      o.status = 'expired';
      o.history.push({ type: 'expire', by: 'system', at: new Date().toISOString() });
      changed = true;
    }
  }
  const soon = dateOnly(new Date(now + 2 * 864e5));
  for (const l of d.listings) {
    if (l.status === 'active' && l.availableUntil && l.availableUntil <= soon && l.availableUntil >= dateOnly() && !l.endingNotified) {
      l.endingNotified = true;
      notify(l.sellerId, 'listingEnding', { crop: l.cropName, date: l.availableUntil }, `/sell/${l.id}/edit`);
      changed = true;
    }
  }
  if (changed) save();
}
export const isExpiredListing = (l) => !!l.availableUntil && l.availableUntil < dateOnly();
