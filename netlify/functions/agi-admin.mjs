import { getStore } from '@netlify/blobs';
import { randomBytes } from 'node:crypto';
import { addSixMonths } from '../shared/agi-email.mjs';
import { STORE, loadAllRecords, rebuildHumanCount, isRecordKey } from '../shared/agi-store.mjs';

// Cleanup (requires SUBSCRIBERS_TOKEN + confirm=1):
//
// Delete one email:
//   POST /.netlify/functions/agi-admin?token=XXX&confirm=1
//   body: {"delete":"spam@example.com"}
//
// Keep only these emails (deletes everything else, marks kept as human):
//   POST ...?token=XXX&confirm=1
//   body: {"keep":["you@mail.com","friend@mail.com"]}
//
// Delete all non-human (bot flood):
//   POST ...?token=XXX&confirm=1
//   body: {"purgeSpam":true}
//
// Delete emails whose address contains a string (e.g. "test"):
//   body: {"deleteContains":"test"}

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
    let deleted = 0;

    if (typeof body.delete === 'string' && body.delete.includes('@')) {
      const email = body.delete.trim().toLowerCase();
      await store.delete(email);
      deleted = 1;
    } else if (body.purgeSpam === true) {
      const records = await loadAllRecords(store);
      for (const r of records) {
        if (r.human !== true) {
          await store.delete(r._key || r.email);
          deleted += 1;
        }
      }
      const { blobs } = await store.list();
      for (const b of blobs) {
        if (b.key.startsWith('rl:')) {
          await store.delete(b.key);
        }
      }
    } else if (
      typeof body.deleteContains === 'string' &&
      body.deleteContains.length >= 2 &&
      body.deleteContains.length <= 40
    ) {
      const needle = body.deleteContains.toLowerCase();
      const max = Math.min(Math.max(parseInt(body.max || '400', 10) || 400, 10), 500);
      const listOpts = { paginate: true, prefix: needle };

      for await (const entry of store.list(listOpts)) {
        const keys = entry.blobs
          .map(b => b.key)
          .filter(k => isRecordKey(k) && k.toLowerCase().includes(needle));
        for (let i = 0; i < keys.length; i += 50) {
          const chunk = keys.slice(i, i + 50);
          await Promise.all(chunk.map(k => store.delete(k)));
          deleted += chunk.length;
          if (deleted >= max) {
            return new Response(
              JSON.stringify({
                ok: true,
                deleted,
                hasMore: true,
                hint: 'call again with same deleteContains until hasMore is false',
              }),
              { headers: { 'Content-Type': 'application/json' } }
            );
          }
        }
      }
    } else if (Array.isArray(body.restore) && body.restore.length > 0) {
      const when = body.subscribedAt || new Date().toISOString();
      for (const raw of body.restore) {
        if (typeof raw !== 'string' || !raw.includes('@')) continue;
        const email = raw.trim().toLowerCase();
        const existing = await store.get(email, { type: 'json' });
        if (existing?.active !== false && existing?.human) continue;
        await store.setJSON(email, {
          email,
          unsubscribeToken: existing?.unsubscribeToken || randomBytes(24).toString('hex'),
          subscribedAt: existing?.subscribedAt || when,
          nextEmailAt: existing?.nextEmailAt || addSixMonths(new Date(when)).toISOString(),
          edition: existing?.edition ?? 0,
          active: true,
          human: true,
          updatedAt: new Date().toISOString(),
        });
      }
    } else if (Array.isArray(body.keep) && body.keep.length > 0) {
      const keep = new Set(
        body.keep.map(e => (typeof e === 'string' ? e.trim().toLowerCase() : '')).filter(Boolean)
      );
      const records = await loadAllRecords(store);
      for (const r of records) {
        const email = r.email?.toLowerCase();
        if (!email) continue;
        if (keep.has(email)) {
          await store.setJSON(email, {
            ...r,
            human: true,
            active: true,
            updatedAt: new Date().toISOString(),
          });
        } else {
          await store.delete(r._key || email);
          deleted += 1;
        }
      }
    } else {
      return new Response(
        JSON.stringify({ error: 'use delete, deleteContains, restore[], keep[], or purgeSpam' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const stats = await rebuildHumanCount(store);
    return new Response(
      JSON.stringify({ ok: true, deleted, ...stats }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[agi-admin] error:', err);
    return new Response(JSON.stringify({ error: 'something went wrong' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
