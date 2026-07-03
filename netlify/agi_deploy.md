# isagihereyet — manual email workflow

**URL:** https://0x45o.com/isagihereyet

## Where emails live

**Netlify → [your site](https://app.netlify.com/projects/superb-stroopwafel-15fe02) → Storage → Blobs → store `agi-waitlist`**

Each key is an email address. Not mixed with app waitlist (`subscribers`).

Easier to review in a spreadsheet via export (below).

---

## Review signups (find your first 7)

Uses `SUBSCRIBERS_TOKEN` from Netlify → Environment variables (same as app subscriber export).

**All signups, oldest first** (your real ones are usually at the top):

```
https://0x45o.com/.netlify/functions/agi-export?token=YOUR_TOKEN&all=1&format=csv
```

**Only the oldest 7 rows:**

```
https://0x45o.com/.netlify/functions/agi-export?token=YOUR_TOKEN&all=1&limit=7&format=csv
```

CSV columns: `email`, `subscribedAt`, `human` (yes/no), `active`, `nextEmailAt`, `ip`

Open in Google Sheets / Excel → confirm the 7 emails → delete the rest (below).

---

## Delete spam, keep only real emails

**Option A — keep a whitelist** (recommended): POST with the emails you want to keep; everything else is deleted and kept rows are marked `human: yes`.

```bash
curl -X POST 'https://0x45o.com/.netlify/functions/agi-admin?token=YOUR_TOKEN&confirm=1' \
  -H 'Content-Type: application/json' \
  -d '{"keep":["email1@example.com","email2@example.com"]}'
```

**Option B — delete one address:**

```bash
curl -X POST 'https://0x45o.com/.netlify/functions/agi-admin?token=YOUR_TOKEN&confirm=1' \
  -H 'Content-Type: application/json' \
  -d '{"delete":"spam@example.com"}'
```

**Option C — delete all bot signups** (no `human: yes`):

```bash
curl -X POST 'https://0x45o.com/.netlify/functions/agi-admin?token=YOUR_TOKEN&confirm=1' \
  -H 'Content-Type: application/json' \
  -d '{"purgeSpam":true}'
```

`confirm=1` is required so a stray link cannot wipe data.

---

## Anti-spam (live now)

New signups need the button + 3s wait, honeypot, rate limits. Public counter uses verified `humanCount` only.

---

## Manual 6-month emails

```
https://0x45o.com/.netlify/functions/agi-export?token=YOUR_TOKEN&human=1&due=1&format=csv
```

Send yourself; links in old rows may still have unsubscribe tokens if you kept them.
