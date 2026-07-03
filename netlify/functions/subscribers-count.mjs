import { getStore } from '@netlify/blobs';

// Public endpoint — returns ONLY the count, no emails or any other data.
// Safe to call from the client.

export default async () => {
  try {
    const store = getStore('subscribers');
    const { blobs } = await store.list();
    return new Response(JSON.stringify({ count: blobs.length }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=30'
      }
    });
  } catch (err) {
    console.error('[subscribers-count] error:', err);
    return new Response(JSON.stringify({ count: 0 }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
