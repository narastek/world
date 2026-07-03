import { getStore } from '@netlify/blobs';

// Protected admin endpoint for exporting subscribers.
// Set SUBSCRIBERS_TOKEN in Netlify env vars.
//
// Examples:
//   /.netlify/functions/subscribers?token=XXX
//     → all subscribers, JSON
//
//   /.netlify/functions/subscribers?token=XXX&app=breakdown
//     → only people interested in breakdown, JSON
//
//   /.netlify/functions/subscribers?token=XXX&app=breakdown&format=csv
//     → only breakdown people, CSV download
//
//   /.netlify/functions/subscribers?token=XXX&format=csv
//     → everyone, CSV (with apps column for manual filtering)

const VALID_APPS = ['breakdown', 'rocketfocus', 'cursorpet'];

export default async (req) => {
  const url = new URL(req.url);
  const token = url.searchParams.get('token');
  const expected = Netlify.env.get('SUBSCRIBERS_TOKEN');

  if (!expected || token !== expected) {
    return new Response('unauthorized', { status: 401 });
  }

  const appFilter = url.searchParams.get('app');
  if (appFilter && !VALID_APPS.includes(appFilter)) {
    return new Response(JSON.stringify({ error: 'invalid app filter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const store = getStore('subscribers');
    const { blobs } = await store.list();

    let records = [];
    for (const b of blobs) {
      const r = await store.get(b.key, { type: 'json' });
      if (r) records.push(r);
    }

    // Apply filter
    if (appFilter) {
      records = records.filter(r => Array.isArray(r.apps) && r.apps.includes(appFilter));
    }

    // Sort newest first
    records.sort((a, b) => (b.subscribedAt || '').localeCompare(a.subscribedAt || ''));

    // CSV output
    if (url.searchParams.get('format') === 'csv') {
      const rows = [['email', 'apps', 'subscribedAt', 'updatedAt']];
      for (const r of records) {
        rows.push([
          r.email,
          (r.apps || []).join('|'),
          r.subscribedAt || '',
          r.updatedAt || ''
        ]);
      }
      const csv = rows.map(row =>
        row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ).join('\n');
      const filename = appFilter ? `subscribers-${appFilter}.csv` : 'subscribers.csv';
      return new Response(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`
        }
      });
    }

    // JSON output
    return new Response(JSON.stringify({
      count: records.length,
      filter: appFilter || null,
      subscribers: records
    }, null, 2), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('[subscribers] error:', err);
    return new Response(JSON.stringify({ error: 'something went wrong' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
