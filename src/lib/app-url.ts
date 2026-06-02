/** Base URL for links in emails (password reset, verification). Server-only; uses APP_URL in production. */
export function getAppBaseUrl(): string {
  const fromAppUrl = process.env.APP_URL?.trim();
  if (fromAppUrl) return fromAppUrl.replace(/\/$/, "");

  const fromPublic = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromPublic) return fromPublic.replace(/\/$/, "");

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, "").replace(/\/$/, "")}`;

  return "http://localhost:3000";
}
