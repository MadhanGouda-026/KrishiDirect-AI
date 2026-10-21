// DEMO identity layer. The client sends `x-demo-user: <id>`; there are no passwords or sessions.
// This is deliberately simple for the demo. Replace with real authentication (OTP/OAuth + signed
// sessions) before any production use — every route already reads identity only from req.user.
import { db } from './db.js';
import { HttpError } from './util.js';

export function demoAuth(req, _res, next) {
  const id = req.header('x-demo-user') || 'b1';
  const user = db().users.find((u) => u.id === id);
  if (!user) return next(new HttpError(401, 'unknownUser'));
  req.user = user;
  next();
}
export const requireRole = (role) => (req, _res, next) =>
  req.user.role === role ? next() : next(new HttpError(403, role === 'farmer' ? 'farmerOnly' : 'buyerOnly'));
