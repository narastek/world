import { getStore } from '@netlify/blobs';
import { randomBytes } from 'node:crypto';
import { addSixMonths } from '../shared/agi-email.mjs';
import { adjustHumanCount } from '../shared/agi-stats.mjs';
import {
  clientIp,
  isRateLimited,
  passesAgiGuard,
} from '../shared/agi-guard.mjs';

// Separate from app launch waitlist (`subscribers` store).
const STORE = 'agi-waitlist';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Fake OK so bots do not retry harder. */
function fakeOk() {
  return json({
    ok: true,
    alreadySubscribed: false,
    nextReminder: addSixMonths(new Date()).toISOString(),
  });
}

export default async (req) => {
  if (req.method !== 'POST') {
    return json({ error: 'method not allowed' }, 405);
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'bad json' }, 400);
  }

  const store = getStore(STORE);
  const ip = clientIp(req);

  if (!passesAgiGuard(req, body) || (await isRateLimited(store, ip))) {
    return fakeOk();
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
    return json({ error: 'invalid email' }, 400);
  }

  try {
    const existing = await store.get(email, { type: 'json' });

    if (existing && existing.active !== false && existing.human) {
      return json({
        ok: true,
        alreadySubscribed: true,
        nextReminder: existing.nextEmailAt,
      });
    }

    const reactivating = existing?.active === false;
    const now = new Date();
    const token = existing?.unsubscribeToken || randomBytes(24).toString('hex');

    const record = {
      email,
      unsubscribeToken: token,
      subscribedAt: existing?.subscribedAt || now.toISOString(),
      nextEmailAt: addSixMonths(now).toISOString(),
      edition: 0,
      active: true,
      human: true,
      updatedAt: now.toISOString(),
      ua: req.headers.get('user-agent') || '',
      ip,
    };

    await store.setJSON(email, record);

    const wasHuman = existing?.human === true && existing.active !== false;
    if (!wasHuman) {
      await adjustHumanCount(store, 1);
    }

    return json({
      ok: true,
      alreadySubscribed: false,
      reactivated: reactivating,
      nextReminder: record.nextEmailAt,
    });
  } catch (err) {
    console.error('[agi-subscribe] error:', err);
    return json({ error: 'something went wrong' }, 500);
  }
};
