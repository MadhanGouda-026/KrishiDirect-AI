import crypto from 'node:crypto';

export const uid = (p) => `${p}_${crypto.randomUUID().slice(0, 8)}`;
export const nowIso = () => new Date().toISOString();
export const dateOnly = (d = new Date()) => new Date(d).toISOString().slice(0, 10);

export class HttpError extends Error {
  constructor(status, code, fields) {
    super(code);
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}
export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
export const bad = (fields) => new HttpError(400, 'validation', fields);
export const forbidden = () => new HttpError(403, 'forbidden');
export const notFound = () => new HttpError(404, 'notFound');
export const conflict = (code = 'badState') => new HttpError(409, code);

export function errorHandler(err, req, res, _next) {
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.code, fields: err.fields });
  if (err?.type === 'entity.too.large') return res.status(413).json({ error: 'imageTooLarge' });
  if (err instanceof SyntaxError) return res.status(400).json({ error: 'invalidJson' });
  console.error(err);
  res.status(500).json({ error: 'serverError' });
}
