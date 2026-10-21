import { createApp } from './app.js';
import { db } from './db.js';

db(); // load or seed
const port = Number(process.env.PORT || 3001);
createApp().listen(port, () => console.log(`KrishiDirect AI API on http://localhost:${port} (demo mode)`));
