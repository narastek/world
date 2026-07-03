export const STATS_KEY = '__stats__';

/** Only signups that pass anti-spam checks increment this (not the old inflated total). */
export async function adjustHumanCount(store, delta) {
  const stats = (await store.get(STATS_KEY, { type: 'json' })) || {};
  stats.humanCount = Math.max(0, (stats.humanCount || 0) + delta);
  await store.setJSON(STATS_KEY, stats);
  return stats.humanCount;
}
