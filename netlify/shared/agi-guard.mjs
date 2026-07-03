const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const MAX_PER_HOUR = 3;
const MAX_PER_DAY = 10;
const MIN_CHECK_MS = 2800;
const MAX_CHECK_MS = 60 * 60 * 1000;

export function clientIp(req) {
  return (
    req.headers.get('x-nf-client-connection-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  );
}

/** Bots often omit UA; real browsers almost always send one. */
export function hasPlausibleClient(req) {
  const ua = req.headers.get('user-agent') || '';
  return ua.length >= 10 && /mozilla|chrome|safari|firefox|edg/i.test(ua);
}

export function isHoneypot(body) {
  const trap = body?.website ?? body?.company ?? body?.url;
  return typeof trap === 'string' && trap.trim().length > 0;
}

/** Must complete the 3s "checking" step before submit (set when button is clicked). */
export function passedIntroCheck(body) {
  const raw = body?.checkedAt;
  if (!raw) return false;
  const t = Date.parse(raw);
  if (!Number.isFinite(t)) return false;
  const elapsed = Date.now() - t;
  return elapsed >= MIN_CHECK_MS && elapsed <= MAX_CHECK_MS;
}

export async function isRateLimited(store, ip) {
  if (!ip || ip === 'unknown') return true;

  const key = `rl:${ip}`;
  const now = Date.now();
  const data = (await store.get(key, { type: 'json' })) || { hour: [], day: [] };
  const hour = (data.hour || []).filter(ts => ts > now - HOUR_MS);
  const day = (data.day || []).filter(ts => ts > now - DAY_MS);

  if (hour.length >= MAX_PER_HOUR || day.length >= MAX_PER_DAY) {
    return true;
  }

  hour.push(now);
  day.push(now);
  await store.setJSON(key, data);
  return false;
}

/** Homepage app signup: modal must be open briefly before confirm (set on openModal). */
export function passedModalStep(body, minMs = 800) {
  const raw = body?.modalOpenedAt;
  if (!raw) return false;
  const t = Date.parse(raw);
  if (!Number.isFinite(t)) return false;
  const elapsed = Date.now() - t;
  return elapsed >= minMs && elapsed <= MAX_CHECK_MS;
}

export function passesAgiGuard(req, body) {
  if (isHoneypot(body)) return false;
  if (!hasPlausibleClient(req)) return false;
  if (!passedIntroCheck(body)) return false;
  return true;
}

export function passesAppSignupGuard(req, body) {
  if (isHoneypot(body)) return false;
  if (!hasPlausibleClient(req)) return false;
  if (!passedModalStep(body)) return false;
  return true;
}

/** @deprecated use passesAgiGuard */
export function passesGuard(req, body) {
  return passesAgiGuard(req, body);
}
