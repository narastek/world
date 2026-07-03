import { getStore } from '@netlify/blobs';
import { STORE, loadAllRecords } from '../shared/agi-store.mjs';

// SUBSCRIBERS_TOKEN in Netlify env.
//
// Review everyone (oldest first — your first 7 are likely at the top):
//   /agi-export?token=XXX&all=1&format=csv
//
// Only verified (post anti-spam) signups:
//   /agi-export?token=XXX&human=1&format=csv
//
// Oldest 7 only:
//   /agi-export?token=XXX&all=1&limit=7&format=csv

function authorize(url) {
  const token = url.searchParams.get('token');
  const expected = Netlify.env.get('SUBSCRIBERS_TOKEN');
  return expected && token === expected;
}

export default async (req) => {
  const url = new URL(req.url);
  if (!authorize(url)) {
    return new Response('unauthorized', { status: 401 });
  }

  const dueOnly = url.searchParams.get('due') === '1';
  const humanOnly = url.searchParams.get('human') === '1';
  const includeAll = url.searchParams.get('all') === '1';
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '0', 10) || 0, 5000);
  const now = Date.now();

  try {
    const store = getStore(STORE);
    let records = await loadAllRecords(store);

    if (!includeAll) {
      records = records.filter(r => r.active !== false);
    }
    if (humanOnly) {
      records = records.filter(r => r.human === true);
    }
    if (dueOnly) {
      records = records.filter(r => {
        const due = r.nextEmailAt ? Date.parse(r.nextEmailAt) : 0;
        return due && due <= now;
      });
    }

    records.sort((a, b) => (a.subscribedAt || '').localeCompare(b.subscribedAt || ''));
    if (limit > 0) records = records.slice(0, limit);

    if (url.searchParams.get('format') === 'csv') {
      const rows = [['email', 'subscribedAt', 'human', 'active', 'nextEmailAt', 'ip']];
      for (const r of records) {
        rows.push([
          r.email,
          r.subscribedAt || '',
          r.human === true ? 'yes' : 'no',
          r.active === false ? 'no' : 'yes',
          r.nextEmailAt || '',
          r.ip || '',
        ]);
      }
      const csv = rows
        .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');
      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="agi-waitlist-review.csv"',
        },
      });
    }

    return new Response(
      JSON.stringify(
        {
          count: records.length,
          dueOnly,
          humanOnly,
          includeAll,
          limit: limit || null,
          subscribers: records,
        },
        null,
        2
      ),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[agi-export] error:', err);
    return new Response(JSON.stringify({ error: 'something went wrong' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
