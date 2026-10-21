import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { demoAuth } from './auth.js';
import { errorHandler } from './util.js';
import { save } from './db.js';
import { sweep } from './domain/sweep.js';
import { router as listings } from './routes/listings.js';
import { router as offers } from './routes/offers.js';
import { router as orders } from './routes/orders.js';
import { router as messages } from './routes/messages.js';
import { router as misc } from './routes/misc.js';

const here = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '2mb' }));
  app.use((_req, res, next) => {
    res.set({ 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin' });
    next();
  });

  const api = express.Router();
  api.use(demoAuth);
  api.use((req, res, next) => {
    sweep();
    if (req.method !== 'GET') res.on('finish', () => { if (res.statusCode < 400) save(); });
    next();
  });
  api.use('/listings', listings);
  api.use('/offers', offers);
  api.use('/orders', orders);
  api.use('/threads', messages);
  api.use('/', misc);
  api.use((_req, res) => res.status(404).json({ error: 'notFound' }));
  app.use('/api', api);

  const dist = path.resolve(here, '../client/dist');
  if (fs.existsSync(dist)) {
    app.use(express.static(dist, { maxAge: '1h' }));
    app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
  }
  app.use(errorHandler);
  return app;
}
