import { getStore } from '@netlify/blobs';
import { addSixMonths, sendAgiEmail } from '../shared/agi-email.mjs';

const STORE = 'agi-waitlist';

export default async () => {
  const store = getStore(STORE);
  const now = Date.now();
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  try {
    const { blobs } = await store.list();
    for (const b of blobs) {
      const record = await store.get(b.key, { type: 'json' });
      if (!record?.email || record.active === false) {
        skipped += 1;
        continue;
      }

      const due = record.nextEmailAt ? Date.parse(record.nextEmailAt) : 0;
      if (!due || due > now) {
        skipped += 1;
        continue;
      }

      try {
        const edition = record.edition ?? 1;
        await sendAgiEmail({
          to: record.email,
          edition,
          unsubscribeToken: record.unsubscribeToken,
        });

        const updated = {
          ...record,
          edition: edition + 1,
          lastEmailAt: new Date().toISOString(),
          nextEmailAt: addSixMonths(new Date()).toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await store.setJSON(record.email, updated);
        sent += 1;
      } catch (err) {
        console.error('[agi-reminder] send failed:', record.email, err);
        failed += 1;
      }
    }

    return new Response(
      JSON.stringify({ ok: true, sent, skipped, failed, ranAt: new Date().toISOString() }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[agi-reminder] error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
