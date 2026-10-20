import { headers } from "next/headers";

/**
 * The public address this request came in on, for absolute URLs in link
 * previews: `localhost` locally, the tunnel address when testing WhatsApp
 * through one, the staging or production domain once deployed — each without
 * configuration. `SITE_URL` overrides it where a proxy hides the real host.
 */
export async function siteOrigin(): Promise<string> {
  const configured = process.env.SITE_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");

  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host")?.split(",")[0].trim() ??
    requestHeaders.get("host") ??
    "localhost:3000";
  const protocol =
    requestHeaders.get("x-forwarded-proto")?.split(",")[0].trim() ??
    (/^(localhost|127\.0\.0\.1)(:|$)/.test(host) ? "http" : "https");
  return `${protocol}://${host}`;
}
