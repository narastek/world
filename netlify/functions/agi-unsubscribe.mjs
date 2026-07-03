import { getStore } from '@netlify/blobs';
import { adjustHumanCount } from '../shared/agi-stats.mjs';

const STORE = 'agi-waitlist';

const page = (title, body) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: monospace; font-size: 13px; display: flex; justify-content: center;
      align-items: center; min-height: 100vh; margin: 0; background: #fff; color: #000; text-align: center; padding: 24px; }
    a { color: #000; }
  </style>
</head>
<body><div>${body}</div></body>
</html>`;

export default async (req) => {
  const token = new URL(req.url).searchParams.get('token')?.trim();
  if (!token) {
    return new Response(page('unsubscribe', '<p>missing token.</p>'), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  try {
    const store = getStore(STORE);
    const { blobs } = await store.list();
    for (const b of blobs) {
      const record = await store.get(b.key, { type: 'json' });
      if (record?.unsubscribeToken === token) {
        const wasHuman = record.active !== false && record.human === true;
        await store.setJSON(record.email, {
          ...record,
          active: false,
          unsubscribedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        if (wasHuman) await adjustHumanCount(store, -1);
        return new Response(
          page(
            'unsubscribed',
            '<p>unsubscribed.</p><p>no more AGI reminders.</p><p><a href="/isagihereyet">← back</a></p>'
          ),
          { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        );
      }
    }

    return new Response(page('not found', '<p>link expired or invalid.</p>'), {
      status: 404,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch (err) {
    console.error('[agi-unsubscribe] error:', err);
    return new Response(page('error', '<p>something went wrong.</p>'), {
      status: 500,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
};
