// Smart Farming Assistant.
// Default: TEMPLATE-BASED helper using rules and app data (labelled as such, never as AI prediction).
// Optional: set AI_API_KEY + AI_MODEL to call the Anthropic Messages API server-side (key never
// reaches the browser). Timeout, usage limit and error fallback are enforced below.
import { findCrop, cropByKey } from '../../shared/crops.js';
import { latestAvg, suggestedRange } from './prices.js';
import { db } from '../db.js';

const TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS || 12000);
const LIMIT = Number(process.env.AI_RATE_LIMIT_PER_10MIN || 20);
const hits = new Map();
export function underLimit(userId) {
  const now = Date.now();
  const arr = (hits.get(userId) || []).filter((t) => now - t < 600000);
  if (arr.length >= LIMIT) { hits.set(userId, arr); return false; }
  arr.push(now); hits.set(userId, arr); return true;
}
export const aiConfigured = () => !!(process.env.AI_API_KEY && process.env.AI_MODEL);

async function callExternal(prompt) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(process.env.AI_API_URL || 'https://api.anthropic.com/v1/messages', {
      method: 'POST', signal: ctl.signal,
      headers: { 'content-type': 'application/json', 'x-api-key': process.env.AI_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: process.env.AI_MODEL, max_tokens: 500,
        system: 'You help Indian smallholder farmers write marketplace listings. Never guarantee yields, profits, prices, or diagnose disease. Be concise and factual.',
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!r.ok) throw new Error(`AI HTTP ${r.status}`);
    const j = await r.json();
    return j.content?.map((c) => c.text).join('\n').trim() || null;
  } finally { clearTimeout(timer); }
}

const DISCLAIMER = 'Guidance only. No guarantees about yield, profit, disease, or future prices.';

function templates(tool, p) {
  const crop = findCrop(p.cropName) || cropByKey(p.cropKey);
  const name = p.cropName || crop?.en || 'produce';
  const where = [p.village, p.district].filter(Boolean).join(', ');
  switch (tool) {
    case 'description': {
      const bits = [`${name}${where ? ` from ${where}` : ''}.`];
      if (p.harvestDate) bits.push(`Harvested on ${p.harvestDate}.`);
      if (p.grade && p.grade !== 'ungraded') bits.push(`Grade ${p.grade}.`);
      if (p.organic === 'organic') bits.push('Declared organic by the farmer.');
      bits.push('Available for pickup or delivery as listed. Message me for sample photos or to discuss quantity.');
      return { text: bits.join(' ') };
    }
    case 'tags': {
      const tags = [crop?.en, p.district, p.grade && `grade-${p.grade}`, p.organic, 'direct-from-farmer', 'bulk'].filter(Boolean).map((t) => String(t).toLowerCase().replace(/\s+/g, '-'));
      return { text: tags.map((t) => `#${t}`).join(' '), items: tags };
    }
    case 'checklist':
      return { items: ['Clean and sort produce; remove damaged pieces', 'Weigh a sample lot and confirm available quantity', 'Take 2–3 clear photos in daylight', 'State harvest date, grade and minimum order honestly', 'Decide pickup point and whether you can deliver', 'Check recent reference prices before setting your ask', 'Reply to buyer enquiries within a day where possible'] };
    case 'buyerQuestions':
      return { items: ['Which quantity do you need, and how often?', 'Will you pick up, or do you need delivery?', 'By which date do you need the produce?', 'Which grade or size do you prefer?', 'How and when will payment be settled? (Agree this directly; this demo processes no payments.)', 'Can you inspect the produce before final acceptance?'] };
    case 'priceExplain': {
      const key = crop?.key;
      const ref = key && latestAvg(key);
      const rng = key && suggestedRange(key);
      const asks = db().listings.filter((l) => l.status === 'active' && l.cropKey === key).map((l) => l.price);
      const lines = ['Prices differ because of quality grade, freshness, quantity, season, transport distance and how many buyers are looking.'];
      if (ref) lines.push(`Demo reference (sample data): about ₹${ref.price}/${ref.unit}.`);
      if (rng) lines.push(`Sample middle range over 14 days: ₹${rng.low}–₹${rng.high}/${rng.unit}.`);
      if (asks.length) lines.push(`Active asking prices on this platform: ₹${Math.min(...asks)}–₹${Math.max(...asks)} (listed units may differ).`);
      lines.push('Higher grade, fresher harvest and nearer buyers can support a higher ask; large lots may justify a discount.');
      return { text: lines.join(' ') };
    }
    case 'trends': {
      const d = db();
      const active = d.listings.filter((l) => l.status === 'active');
      const open = d.offers.filter((o) => ['pending', 'countered'].includes(o.status));
      const byCat = {};
      active.forEach((l) => { byCat[l.category] = (byCat[l.category] || 0) + 1; });
      const top = Object.entries(byCat).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${k} (${v})`).join(', ');
      return { text: `Based on current demo data: ${active.length} active listings and ${open.length} open offers. Most listed categories: ${top || 'none yet'}. This describes sample activity only, not the real market.` };
    }
    default:
      return null;
  }
}

export async function runAssistant(tool, params) {
  const base = templates(tool, params);
  if (!base) return null;
  const out = { tool, ...base, source: 'template', label: 'Demo assistant — template-based, not an AI prediction', disclaimer: DISCLAIMER };
  if (aiConfigured() && ['description', 'priceExplain'].includes(tool)) {
    try {
      const prompt = `Task: ${tool}. Details: ${JSON.stringify(params).slice(0, 1200)}. Draft text to improve (keep facts, add nothing unverifiable): ${base.text}`;
      const text = await callExternal(prompt);
      if (text) return { ...out, text, source: 'ai', label: 'AI-generated draft — review before using' };
    } catch (e) {
      out.note = 'External AI unavailable; showing template result.';
      console.warn('AI call failed:', e.message);
    }
  }
  return out;
}
