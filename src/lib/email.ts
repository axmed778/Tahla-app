import { Resend } from "resend";
import { getAppBaseUrl } from "@/lib/app-url";

const APP_NAME = "Təhlə Tətbiqi";

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return null;
  return new Resend(key);
}

function wrapHtml(title: string, bodyLines: string[]): string {
  const inner = bodyLines.map((line) => `<p style="margin:0 0 12px 0;">${line}</p>`).join("");
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family:system-ui,Segoe UI,sans-serif;font-size:15px;line-height:1.5;color:#111;">
  <div style="max-width:480px;margin:0 auto;padding:24px;">
    <h1 style="font-size:18px;margin:0 0 16px 0;">${APP_NAME}</h1>
    <h2 style="font-size:16px;margin:0 0 12px 0;">${title}</h2>
    ${inner}
    <p style="margin:16px 0 0 0;font-size:12px;color:#666;">${APP_NAME}</p>
  </div>
</body>
</html>`;
}

export type SendEmailResult = { ok: true } | { ok: false; error: string };

export async function sendTransactionalEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<SendEmailResult> {
  const resend = getResend();
  const from = process.env.RESEND_FROM?.trim() ?? `${APP_NAME} <onboarding@resend.dev>`;
  if (!resend) {
    console.warn("[email] RESEND_API_KEY is not set; email not sent:", params.subject, "→", params.to);
    return { ok: false, error: "Email is not configured (RESEND_API_KEY)." };
  }
  try {
    const { error } = await resend.emails.send({
      from,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });
    if (error) {
      console.error("[email] Resend error:", error);
      return { ok: false, error: typeof error === "object" && error && "message" in error ? String((error as { message: string }).message) : "Send failed" };
    }
    return { ok: true };
  } catch (err) {
    console.error("[email] Resend send threw:", err);
    return { ok: false, error: err instanceof Error ? err.message : "Send failed" };
  }
}

export async function sendVerificationEmail(to: string, token: string): Promise<SendEmailResult> {
  const url = `${getAppBaseUrl()}/verify-email?token=${encodeURIComponent(token)}`;
  const html = wrapHtml("Verify your email", [
    "Thanks for registering. Please confirm your email address by clicking the link below:",
    `<a href="${url}" style="color:#2563eb;">Verify email</a>`,
    `If the button does not work, copy this URL into your browser:<br/><span style="word-break:break-all;font-size:13px;">${url}</span>`,
  ]);
  return sendTransactionalEmail({
    to,
    subject: `${APP_NAME} — verify your email`,
    html,
  });
}

export async function sendPasswordResetEmail(to: string, token: string): Promise<SendEmailResult> {
  const url = `${getAppBaseUrl()}/reset-password?token=${encodeURIComponent(token)}`;
  const html = wrapHtml("Reset your password", [
    "We received a request to reset your password. Click the link below (valid for 1 hour):",
    `<a href="${url}" style="color:#2563eb;">Reset password</a>`,
    `If you did not request this, you can ignore this email.`,
    `If the link does not work, copy this URL:<br/><span style="word-break:break-all;font-size:13px;">${url}</span>`,
  ]);
  return sendTransactionalEmail({
    to,
    subject: `${APP_NAME} — password reset`,
    html,
  });
}
