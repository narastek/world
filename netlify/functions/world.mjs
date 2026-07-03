import { getStore } from '@netlify/blobs';
import { COUNTRY_AREAS } from './country-areas.mjs';

// everyone's submissions live in one small json blob:
// { users: { [id]: { n: <countries>, a: <km^2>, c: [codes], t: <updatedAt> } } }
const STORE_NAME = 'world';
const DATA_KEY = 'submissions';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

async function loadData(store) {
  const data = await store.get(DATA_KEY, { type: 'json' });
  return data && typeof data === 'object' && data.users ? data : { users: {} };
}

function mostVisitedCountry(users) {
  const counts = {};
  for (const u of Object.values(users)) {
    for (const code of u.c || []) counts[code] = (counts[code] || 0) + 1;
  }
  let best = null;
  for (const [code, count] of Object.entries(counts)) {
    if (!best || count > counts[best]) best = code;
  }
  return best;
}

function buildStats(users, selfId) {
  const ids = Object.keys(users);
  const totalPeople = ids.length;
  const stats = { totalPeople, mostVisited: mostVisitedCountry(users) };

  if (selfId && users[selfId] && totalPeople > 1) {
    const self = users[selfId];
    const others = ids.filter(id => id !== selfId).map(id => users[id]);
    const beatCountries = others.filter(u => u.n < self.n).length;
    const beatArea = others.filter(u => u.a < self.a).length;
    stats.beatCountriesPct = (beatCountries / others.length) * 100;
    stats.beatAreaPct = (beatArea / others.length) * 100;
    stats.avgCountries = ids.reduce((s, id) => s + users[id].n, 0) / totalPeople;
  }

  return stats;
}

export default async function handler(req) {
  const store = getStore(STORE_NAME);

  if (req.method === 'GET') {
    const { users } = await loadData(store);
    return json(buildStats(users));
  }

  if (req.method === 'POST') {
    let body;
    try {
      body = await req.json();
    } catch {
      return json({ error: 'invalid json' }, 400);
    }

    const { id, countries } = body || {};
    if (typeof id !== 'string' || id.length < 8 || id.length > 64) {
      return json({ error: 'invalid id' }, 400);
    }
    if (!Array.isArray(countries)) {
      return json({ error: 'invalid countries' }, 400);
    }

    // keep only real iso codes, dedup, and compute area server-side
    const codes = [...new Set(countries)].filter(
      c => typeof c === 'string' && COUNTRY_AREAS[c] !== undefined
    );
    const area = codes.reduce((sum, c) => sum + COUNTRY_AREAS[c], 0);

    const data = await loadData(store);
    data.users[id] = { n: codes.length, a: area, c: codes, t: Date.now() };
    await store.setJSON(DATA_KEY, data);

    return json(buildStats(data.users, id));
  }

  return json({ error: 'method not allowed' }, 405);
}

export const config = { path: '/api/world' };
