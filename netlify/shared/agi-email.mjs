const SITE_URL = () => Netlify.env.get('SITE_URL') || 'https://0x45o.com';
const FROM = () =>
  Netlify.env.get('AGI_FROM_EMAIL') || 'AGI Watch <onboarding@resend.dev>';

const MESSAGES = [
  'still no AGI. experts remain confident it is 6 months away.',
  'checked everywhere. AGI is not here yet. see you in 6 months.',
  'the timeline has not changed: AGI is approximately 6 months out. (it was 6 months ago too.)',
  'breaking: AGI has not arrived. analysts maintain a 6-month horizon.',
  'your AGI status update: not here. ETA unchanged at ~6 months.',
];

export function addSixMonths(from = new Date()) {
  const d = new Date(from);
  d.setMonth(d.getMonth() + 6);
  return d;
}

export function pickMessage(edition = 0) {
  return MESSAGES[edition % MESSAGES.length];
}

export function buildEmailHtml({ message, edition, unsubscribeUrl }) {
  const n = edition + 1;
  return `<!DOCTYPE html>
<html>
<body style="font-family:monospace;font-size:14px;line-height:1.6;color:#111;max-width:480px;margin:0 auto;padding:24px;">
  <p style="margin:0 0 16px;">is AGI here yet?</p>
  <p style="margin:0 0 16px;font-size:16px;"><strong>no.</strong></p>
  <p style="margin:0 0 24px;color:#444;">${message}</p>
  <p style="margin:0 0 8px;color:#888;font-size:12px;">reminder #${n} · next check in ~6 months</p>
  <p style="margin:24px 0 0;font-size:12px;color:#aaa;">
    <a href="${SITE_URL()}/isagihereyet" style="color:#666;">0x45o.com/isagihereyet</a>
    · <a href="${unsubscribeUrl}" style="color:#666;">unsubscribe</a>
  </p>
</body>
</html>`;
}

export async function sendAgiEmail({ to, edition = 0, unsubscribeToken }) {
  const apiKey = Netlify.env.get('RESEND_API_KEY');
  if (!apiKey) {
    throw new Error('RESEND_API_KEY not configured');
  }

  const message = pickMessage(edition);
  const unsubscribeUrl = `${SITE_URL()}/.netlify/functions/agi-unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`;
  const subject = 'AGI is still not here yet';

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM(),
      to: [to],
      subject,
      html: buildEmailHtml({ message, edition, unsubscribeUrl }),
      text: `is AGI here yet?\n\nno.\n\n${message}\n\nunsubscribe: ${unsubscribeUrl}`,
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`resend ${res.status}: ${err}`);
  }

  return { message, subject };
}
