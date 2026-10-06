import 'server-only';

const HTML_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => HTML_ESCAPES[character]);

export async function sendThemedEmail(to: string, subject: string, heading: string, message: string, idempotencyKey: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) throw new Error('EMAIL_NOT_CONFIGURED');
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify({
      from, to: [to], subject,
      html: `<div style="margin:0;background:#080a14;padding:36px 16px;font-family:Inter,Arial,sans-serif;color:#f8fafc"><div style="max-width:560px;margin:auto;overflow:hidden;border:1px solid rgba(255,255,255,.12);border-radius:22px;background:#111321"><div style="padding:24px 28px;background:linear-gradient(110deg,#6d4aff,#2386ee);font-weight:800;font-size:20px;letter-spacing:.02em">Ping World</div><div style="padding:30px 28px"><h1 style="margin:0 0 14px;font-size:24px">${escapeHtml(heading)}</h1><p style="margin:0;color:#c7c9d6;line-height:1.7">${escapeHtml(message)}</p><p style="margin:28px 0 0;color:#9ca3b5;font-size:12px">Made for your ideas, work, and assessments.</p></div></div></div>`,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`EMAIL_PROVIDER_${response.status}`);
}
