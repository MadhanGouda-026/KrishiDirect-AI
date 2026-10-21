# Translations

Files: `client/src/i18n/locales/{en,kn,hi,tu}.json`. English is complete and authoritative.

| Language | Status |
|---|---|
| English | Complete |
| Kannada | Core UI (nav, forms, statuses, notifications, validation, dashboards) ≈ 50% of keys; the rest falls back to English. **Needs native-speaker review.** |
| Hindi | Same coverage as Kannada. **Needs native-speaker review.** |
| Tulu | **Intentionally not machine-guessed.** Falls back to Kannada (same script) then English. |

## Adding reviewed Tulu text
1. Copy a section from `kn.json` into `tu.json` with the same keys.
2. Replace values with reviewed Tulu; commit reviewer name in the PR.
3. Run `node scripts/check-i18n.mjs` to see coverage and missing keys.

Crop and district names come from `shared/crops.js` and `shared/geo.js` (English/Kannada/Hindi).
Search matches English, Kannada and Hindi names and common aliases.
