import { getStore } from '@netlify/blobs';
import { DEFAULT_PAYOUTS } from '../shared/stock-data.mjs';

const STORE = 'stock';
const PAYOUTS_KEY = 'payouts';

function authorize(url) {
  const token = url.searchParams.get('token');
  const expected = Netlify.env.get('SUBSCRIBERS_TOKEN');
  return expected && token === expected && url.searchParams.get('confirm') === '1';
}

export default async (req) => {
  const url = new URL(req.url);
  if (!authorize(url)) {
    return new Response('unauthorized — need token and confirm=1', { status: 401 });
  }
  if (req.method !== 'POST') {
    return new Response('POST only', { status: 405 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'bad json' }), { status: 400 });
  }

  try {
    const store = getStore(STORE);
    let payouts = await store.get(PAYOUTS_KEY, { type: 'json' });
    if (!Array.isArray(payouts) || payouts.length === 0) {
      payouts = DEFAULT_PAYOUTS.slice();
    }

    if (Array.isArray(body.payouts) && body.payouts.length > 0) {
      payouts = body.payouts;
    } else if (body.append && typeof body.append === 'object') {
      const p = body.append;
      if (!p.end || !p.label || !Number.isFinite(p.payout)) {
        return new Response(JSON.stringify({ error: 'append needs end, label, payout' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      payouts = payouts.concat([{ end: p.end, label: p.label, payout: p.payout }]);
    } else if (body.reset === true) {
      await store.delete(PAYOUTS_KEY);
      return new Response(JSON.stringify({ ok: true, reset: true, count: DEFAULT_PAYOUTS.length }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } else {
      return new Response(JSON.stringify({ error: 'use payouts[], append{}, or reset:true' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await store.setJSON(PAYOUTS_KEY, payouts);
    return new Response(JSON.stringify({ ok: true, count: payouts.length }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[stock-admin] error:', err);
    return new Response(JSON.stringify({ error: 'something went wrong' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
