import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';

process.env.DATA_FILE = path.join(os.tmpdir(), `kd-test-${process.pid}.json`);
const { createApp } = await import('../app.js');
const { resetDb } = await import('../db.js');

let server, base;
before(() => { resetDb(); return new Promise((r) => { server = createApp().listen(0, () => { base = `http://localhost:${server.address().port}/api`; r(); }); }); });
after(() => server.close());

const call = async (user, method, url, body) => {
  const r = await fetch(base + url, { method, headers: { 'content-type': 'application/json', 'x-demo-user': user }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, body: await r.json().catch(() => null) };
};
const validListing = { cropName: 'Test Tomato', category: 'vegetables', price: 20, priceUnit: 'kg', quantity: 100, quantityUnit: 'kg', minOrder: 10, grade: 'A', harvestDate: new Date().toISOString().slice(0, 10), district: 'hassan', fulfilment: ['pickup'], organic: 'conventional' };

test('marketplace filters change results and support Kannada aliases', async () => {
  const all = (await call('b1', 'GET', '/listings?pageSize=48')).body;
  assert.ok(all.total >= 15);
  const kn = (await call('b1', 'GET', '/listings?q=ಟೊಮೆಟೊ')).body;
  assert.ok(kn.items.length >= 1 && kn.items.every((l) => l.cropKey === 'tomato'));
  const veg = (await call('b1', 'GET', '/listings?category=vegetables')).body;
  assert.ok(veg.total < all.total && veg.items.every((l) => l.category === 'vegetables'));
  const cheap = (await call('b1', 'GET', '/listings?maxPrice=25&pageSize=48')).body;
  assert.ok(cheap.items.every((l) => l.basePrice <= 25));
});

test('listing CRUD with server validation and ownership checks', async () => {
  const bad = await call('f1', 'POST', '/listings', { ...validListing, price: -1 });
  assert.equal(bad.status, 400);
  assert.equal(bad.body.fields.price, 'positive');
  assert.equal((await call('b1', 'POST', '/listings', validListing)).status, 403); // buyers cannot sell
  const made = await call('f1', 'POST', '/listings', validListing);
  assert.equal(made.status, 201);
  const id = made.body.id;
  assert.equal((await call('f2', 'PUT', `/listings/${id}`, { ...validListing, price: 30 })).status, 403); // not owner
  assert.equal((await call('f2', 'DELETE', `/listings/${id}`)).status, 403);
  const upd = await call('f1', 'PUT', `/listings/${id}`, { ...validListing, price: 30 });
  assert.equal(upd.body.price, 30);
  assert.equal((await call('f1', 'PATCH', `/listings/${id}/status`, { status: 'paused' })).body.status, 'paused');
  const search = (await call('b1', 'GET', '/listings?q=Test Tomato')).body;
  assert.equal(search.total, 0); // paused listings are hidden
  assert.equal((await call('f1', 'DELETE', `/listings/${id}`)).status, 200);
});

test('offer state machine and stock handling', async () => {
  const lst = 'lst_007'; // chilli, 300 kg, min 20
  assert.equal((await call('b1', 'POST', '/offers', { listingId: lst, price: 30, quantity: 5 })).body.fields.quantity, 'belowMinOrder');
  assert.equal((await call('b1', 'POST', '/offers', { listingId: lst, price: 30, quantity: 99999 })).body.fields.quantity, 'exceedsStock');
  const o = await call('b3', 'POST', '/offers', { listingId: lst, price: 33, quantity: 50, note: 'hi' });
  assert.equal(o.status, 201);
  const id = o.body.id;
  assert.equal((await call('b3', 'POST', `/offers/${id}/accept`)).status, 403); // buyer cannot accept own offer
  assert.equal((await call('f5', 'POST', `/offers/${id}/accept`)).status, 403); // wrong seller
  const ctr = await call('f3', 'POST', `/offers/${id}/counter`, { price: 36 });
  assert.equal(ctr.body.offer.status, 'countered');
  assert.equal((await call('f3', 'POST', `/offers/${id}/accept`)).status, 403); // seller cannot accept own counter
  const acc = await call('b3', 'POST', `/offers/${id}/accept`);
  assert.equal(acc.body.offer.status, 'accepted');
  assert.equal(acc.body.order.subtotal, 36 * 50);
  assert.equal((await call('b3', 'POST', `/offers/${id}/withdraw`)).status, 409); // terminal state
  const after = (await call('b1', 'GET', `/listings/${lst}`)).body.listing;
  assert.equal(after.quantity, 250);
});

test('order lifecycle, cancellation rules, and stock restore', async () => {
  const placed = await call('b2', 'POST', '/orders', { listingId: 'lst_002', quantity: 10, method: 'pickup' });
  assert.equal(placed.status, 201);
  assert.equal(placed.body.demo, true);
  const id = placed.body.id;
  assert.equal((await call('b2', 'POST', `/orders/${id}/prepare`)).status, 403);
  assert.equal((await call('f5', 'POST', `/orders/${id}/prepare`)).status, 409); // must confirm first
  assert.equal((await call('f5', 'POST', `/orders/${id}/confirm`)).body.status, 'confirmed');
  assert.equal((await call('f5', 'POST', `/orders/${id}/prepare`)).body.status, 'prepared');
  assert.equal((await call('b2', 'POST', `/orders/${id}/cancel`)).status, 409); // too late to cancel
  assert.equal((await call('f5', 'POST', `/orders/${id}/dispatch`)).body.status, 'ready_for_pickup');
  const done = await call('b2', 'POST', `/orders/${id}/receive`);
  assert.equal(done.body.status, 'received');
  assert.ok(done.body.timeline.length >= 5);
  const o2 = await call('b2', 'POST', '/orders', { listingId: 'lst_002', quantity: 10, method: 'pickup' });
  const before = (await call('b1', 'GET', '/listings/lst_002')).body.listing.quantity;
  await call('b2', 'POST', `/orders/${o2.body.id}/cancel`);
  assert.equal((await call('b1', 'GET', '/listings/lst_002')).body.listing.quantity, before + 10);
});

test('enquiries are private to participants', async () => {
  const t = await call('b2', 'POST', '/threads', { listingId: 'lst_003', body: 'Can you deliver?' });
  assert.equal(t.status, 201);
  assert.equal((await call('b1', 'GET', `/threads/${t.body.id}`)).status, 403);
  assert.equal((await call('f1', 'POST', `/threads/${t.body.id}/messages`, { body: 'Yes.' })).status, 201);
});

test('prices are labelled demo, assistant is labelled template, weather is sample', async () => {
  const p = (await call('f1', 'GET', '/prices/tomato')).body;
  assert.equal(p.meta.live, false);
  assert.match(p.meta.label, /Demo Data/);
  const a = (await call('f1', 'POST', '/assistant', { tool: 'checklist' })).body;
  assert.equal(a.source, 'template');
  assert.equal((await call('b1', 'POST', '/assistant', { tool: 'checklist' })).status, 403);
  assert.equal((await call('f1', 'GET', '/weather?district=udupi')).body.live, false);
});

test('recommendations explain themselves', async () => {
  const r = (await call('b1', 'POST', '/recommendations', { crops: ['tomato'], districts: ['shivamogga'], quantity: 100, budget: 40 })).body;
  assert.equal(r.method.ml, false);
  assert.ok(r.items[0].reasons.includes('crop'));
});
