<<<<<<< HEAD
# KrishiDirect AI — *Sell Fresh. Earn Better.*

A full-stack demo marketplace for **PS 1.2 — Direct Market-Access Platform for Marginal Farmers** (Karnataka focus).
Farmers list produce, buyers search/compare, send offers, negotiate, place **Demo Orders**, and message each other —
in English, Kannada and Hindi (Tulu pending review).

> **Everything here is a demonstration.** Prices, weather, people and activity are sample data. No payments, no real
> verification, no live market feeds. Every such section is labelled in the UI.

## Quick start

```bash
npm install
npm run dev          # API on :3001, web on http://localhost:5173
```

Production style (single process, serves the built client):

```bash
npm run build && npm start     # http://localhost:3001
npm test                       # API tests (offers, orders, ownership, validation)
node scripts/check-i18n.mjs    # translation key coverage
```

Requires Node 18+ (tested on Node 22). Data lives in `server/data/db.json` (created on first run). Reset from the UI
(**Demo Mode & Reset**) or `npm run seed`.

## Using the demo

Use the identity menu (top-right) to switch between sample farmers (🧑‍🌾) and buyers (🛒).
Try: **Farmer** → *Sell Harvest* → publish → **Buyer** → open the listing → *Send offer* → **Farmer** → *Offers* → counter →
**Buyer** accepts → *Orders* → farmer confirms/prepares/dispatches → buyer marks received.

## Architecture

```
shared/    validation, units, crops catalogue (EN/KN/HI aliases), Karnataka districts — used by client AND server
server/    Express API, JSON-file DB, domain rules (offers/orders state machines), services (prices, weather, assistant, recommender)
client/    React 18 + Vite + React Router + i18next + Recharts
```

* **Server-side authority:** the same `shared/validators.js` runs in the browser (inline errors) and on the API.
  Ownership checks, offer/order state transitions, stock reservation/restoration and role checks are enforced in the API.
* **Offers:** pending → accepted / rejected / countered / withdrawn / expired (72 h, `OFFER_TTL_HOURS`). A buyer cannot accept their
  own pending offer; a seller cannot accept their own counter. Accepting creates a Demo Order.
* **Orders:** placed → confirmed → prepared → dispatched/ready for pickup → received; reject/cancel rules restore stock.
* **Units:** kg, quintal, tonne, piece, dozen with correct subtotal conversion.
* **Accessibility:** skip link, labelled controls, focus-trapped dialogs, `aria-live` toasts, reduced-motion support,
  chart data tables for screen readers.

## Integration points (nothing fake is switched on by default)

| Area | File | How to connect |
|---|---|---|
| Market prices | `server/services/prices.js` | Implement the provider interface (`meta, markets, cropKeys, series`) and set `PRICE_PROVIDER`, `PRICE_API_URL`, `PRICE_API_KEY`. Until a real provider reports `live: true`, the UI says *Demo Data — Not Live Market Prices*. |
| Weather | `server/services/weather.js` | Implement `fetchLive`; set `WEATHER_PROVIDER`, `WEATHER_API_KEY`. Default returns *Sample Weather — Not Live*. |
| AI assistant | `server/services/assistant.js` | Set `AI_API_KEY` + `AI_MODEL` (server-side only). Has a timeout, per-user rate limit and template fallback. Default is template-based and labelled as such. |
| Recommendations | `server/services/recommend.js` | Deterministic, explainable scoring. Add an external scorer behind `RECOMMENDER_URL`; no ML is claimed. |
| Maps / distance | `shared/geo.js` | Approximate straight-line distance between district centres. Add a maps provider via `MAPS_API_KEY` if desired. |
| Auth | `server/auth.js` | Demo header identity. Replace with OTP/OAuth + sessions before real use. |
| Storage | `server/db.js` | JSON file. Swap for SQLite/Postgres by re-implementing `db()/save()/resetDb()`. |

See `.env.example` for all variables.

## Deployment

* **Docker:** `docker build -t krishidirect . && docker run -p 3001:3001 -v kd-data:/data krishidirect`
* **Render:** `render.yaml` blueprint (persistent disk for the JSON DB).
* Any Node host: `npm ci && npm run build && npm start`.

## Known limitations

* Photos are not bundled: crops use illustrated placeholders and the hero is an original SVG illustration. Uploaded images are
  resized client-side and stored inline; for production use object storage/CDN and add licensed photography.
* Tulu is not translated (falls back to Kannada → English); Kannada/Hindi cover core UI only and need native review. Long-form
  legal/help text is English.
* JSON-file storage is single-process and not meant for concurrent production load.
* Legal pages (About, Privacy, Terms) are professional templates describing this demo build; have counsel review before launch.
* Verified badges appear only as "Demo verified"; organic status is farmer-declared.
=======
# KrishiDirect-AI
>>>>>>> 4a1b080ab527987eeca1ab7d8c38c4a20000ed9d
