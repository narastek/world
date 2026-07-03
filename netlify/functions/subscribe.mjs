import { getStore } from '@netlify/blobs';
import {
  clientIp,
  isRateLimited,
  passesAppSignupGuard,
} from '../shared/agi-guard.mjs';

const VALID_APPS = ['breakdown', 'rocketfocus', 'cursorpet'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STORE = 'subscribers';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function fakeOk() {
  return json({ ok: true });
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

  if (!passesAppSignupGuard(req, body) || (await isRateLimited(store, ip))) {
    return fakeOk();
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
    return json({ error: 'invalid email' }, 400);
  }

  if (email.endsWith('@example.com') || email.endsWith('@test.com')) {
    return fakeOk();
  }

  const apps = Array.isArray(body.apps)
    ? [...new Set(body.apps.filter(a => VALID_APPS.includes(a)))]
    : [];
  if (apps.length === 0) {
    return json({ error: 'pick at least one app' }, 400);
  }

  try {
    const existing = await store.get(email, { type: 'json' });
    const mergedApps =
      existing && Array.isArray(existing.apps)
        ? [...new Set([...existing.apps, ...apps])]
        : apps;

    const record = {
      email,
      apps: mergedApps,
      subscribedAt: existing?.subscribedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ua: req.headers.get('user-agent') || '',
      ip,
    };

    await store.setJSON(email, record);

    return json({ ok: true });
  } catch (err) {
    console.error('[subscribe] error:', err);
    return json({ error: 'something went wrong' }, 500);
  }
};
