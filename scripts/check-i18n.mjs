// Verifies every t('key') used in the client exists in en.json and reports gaps in kn/hi/tu.
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '../client/src');
const load = (l) => JSON.parse(fs.readFileSync(path.join(root, `i18n/locales/${l}.json`), 'utf8'));
const flat = (o, p = '') => Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' && !Array.isArray(v) ? flat(v, `${p}${k}.`) : [`${p}${k}`]));
const en = new Set(flat(load('en')));
const files = [];
(function walk(d) { for (const f of fs.readdirSync(d, { withFileTypes: true })) f.isDirectory() ? walk(path.join(d, f.name)) : /\.jsx?$/.test(f.name) && files.push(path.join(d, f.name)); })(root);
const used = new Set();
const dyn = [];
for (const f of files) {
  const s = fs.readFileSync(f, 'utf8');
  for (const m of s.matchAll(/\bt\(\s*'([a-zA-Z0-9_.]+)'/g)) used.add(m[1]);
  for (const m of s.matchAll(/\bt\(\s*`([^`]+)`/g)) dyn.push(`${path.basename(f)}: ${m[1]}`);
}
const missing = [...used].filter((k) => !en.has(k));
console.log(`static keys used: ${used.size}; missing in en.json: ${missing.length}`);
missing.forEach((k) => console.log('  MISSING', k));
for (const l of ['kn', 'hi', 'tu']) {
  const have = new Set(flat(load(l)));
  const gap = [...en].filter((k) => !have.has(k));
  console.log(`${l}: ${en.size - gap.length}/${en.size} keys translated (${Math.round(((en.size - gap.length) / en.size) * 100)}%); rest fall back`);
}
console.log('dynamic key templates (verify manually):', [...new Set(dyn)].length);
if (process.argv.includes('--dyn')) dyn.forEach((d) => console.log('  ', d));
process.exitCode = missing.length ? 1 : 0;
