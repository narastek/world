import { getStore } from '@netlify/blobs';
import { allPayouts, DEFAULT_PAYOUTS } from '../shared/stock-data.mjs';

const STORE = 'stock';
const PAYOUTS_KEY = 'payouts';
const FOLLOWERS_TTL_MS = 5 * 60 * 1000;

let followerCache = { at: 0, followers: null };

async function loadPayouts() {
  try {
    const store = getStore(STORE);
    const saved = await store.get(PAYOUTS_KEY, { type: 'json' });
    if (Array.isArray(saved) && saved.length > 0) return allPayouts(saved);
  } catch (err) {
    console.error('[stock] blob read failed:', err);
  }
  return allPayouts(DEFAULT_PAYOUTS);
}

async function fetchFollowersFrom(url) {
  const res = await fetch(url, { headers: { 'User-Agent': '0x45o-stock/1' } });
  if (!res.ok) throw new Error(url + ' ' + res.status);
  const data = await res.json();
  const followers = data?.user?.followers;
  if (!Number.isFinite(followers) || followers <= 0) throw new Error('invalid follower count');
  return followers;
}

async function fetchLiveFollowers() {
  const now = Date.now();
  if (followerCache.followers && now - followerCache.at < FOLLOWERS_TTL_MS) {
    return followerCache.followers;
  }

  for (const url of ['https://api.fxtwitter.com/0x45o', 'https://api.vxtwitter.com/0x45o']) {
    try {
      const followers = await fetchFollowersFrom(url);
      followerCache = { at: now, followers };
      return followers;
    } catch (err) {
      console.error('[stock] follower fetch failed:', err.message || err);
    }
  }

  if (followerCache.followers) return followerCache.followers;
  return null;
}

export default async () => {
  try {
    const payouts = await loadPayouts();
    const followers = await fetchLiveFollowers();

    return new Response(
      JSON.stringify({ followers, payouts }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=60',
        },
      }
    );
  } catch (err) {
    console.error('[stock] error:', err);
    return new Response(JSON.stringify({ error: 'something went wrong' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
