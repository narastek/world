// Netlify Function: site-wide visit counter backed by Netlify Blobs
// GET → returns current count without incrementing
// POST → increments by 1 and returns the new count
import { getStore } from '@netlify/blobs';

export default async (req) => {
  try {
    const store = getStore('site-stats');
    const raw = await store.get('total-visits');
    let count = raw ? parseInt(raw, 10) : 0;
    if (!Number.isFinite(count)) count = 0;

    if (req.method === 'POST') {
      count += 1;
      await store.set('total-visits', String(count));
    }

    return new Response(JSON.stringify({ visits: count }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ visits: null, error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const config = { path: '/.netlify/functions/visits' };
