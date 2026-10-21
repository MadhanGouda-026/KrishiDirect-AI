// Tiny JSON-file database. Swap for SQLite/Postgres later by re-implementing these four functions
// and the collection access in routes/domain (all data access goes through db()).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSeed } from './seed.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const file = () => process.env.DATA_FILE || path.join(here, 'data', 'db.json');
let state = null;

export function db() {
  if (state) return state;
  try {
    state = JSON.parse(fs.readFileSync(file(), 'utf8'));
  } catch {
    state = buildSeed();
    save();
  }
  return state;
}
export function save() {
  if (!state) return;
  fs.mkdirSync(path.dirname(file()), { recursive: true });
  const tmp = `${file()}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(state));
  fs.renameSync(tmp, file());
}
export function resetDb() {
  state = buildSeed();
  save();
  return state;
}
