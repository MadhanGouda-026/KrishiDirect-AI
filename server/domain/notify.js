import { db } from '../db.js';
import { uid, nowIso } from '../util.js';

/** Notifications are generated from real events; the client translates by `type`. */
export function notify(userId, type, data = {}, link = '/') {
  db().notifications.unshift({ id: uid('n'), userId, type, data, link, read: false, at: nowIso() });
}
