import { STATS_KEY } from './agi-stats.mjs';

export const STORE = 'agi-waitlist';

export function isRecordKey(key) {
  return key !== STATS_KEY && !key.startsWith('rl:');
}

export async function loadAllRecords(store) {
  const { blobs } = await store.list();
  const keys = blobs.map(b => b.key).filter(isRecordKey);
  const records = [];

  for (let i = 0; i < keys.length; i += 40) {
    const chunk = keys.slice(i, i + 40);
    const batch = await Promise.all(
      chunk.map(async key => {
        try {
          const r = await store.get(key, { type: 'json' });
          return r?.email ? { ...r, _key: key } : null;
        } catch {
          return null;
        }
      })
    );
    records.push(...batch.filter(Boolean));
  }

  return records;
}

export async function rebuildHumanCount(store) {
  const records = await loadAllRecords(store);
  const humanCount = records.filter(r => r.human === true && r.active !== false).length;
  await store.setJSON(STATS_KEY, { humanCount });
  return { humanCount, total: records.length };
}
