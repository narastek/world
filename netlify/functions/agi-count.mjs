import { getStore } from '@netlify/blobs';
import { STATS_KEY } from '../shared/agi-stats.mjs';
import { STORE, loadAllRecords } from '../shared/agi-store.mjs';

export default async () => {
  try {
    const store = getStore(STORE);
    const records = await loadAllRecords(store);
    const count = records.filter(r => r.human === true && r.active !== false).length;
    await store.setJSON(STATS_KEY, { humanCount: count });
    return json(count);
  } catch (err) {
    console.error('[agi-count] error:', err);
    return json(0);
  }
};

function json(count) {
  return new Response(JSON.stringify({ count }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=30',
    },
  });
}
