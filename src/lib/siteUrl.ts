/**
 * Public site origin for QR codes, README badge snippets, and share URLs.
 *
 * - Set `VITE_PUBLIC_SITE_URL` at **build time** (e.g. Railway) so production
 *   assets always point at your canonical domain even if you open the app via a preview URL.
 * - Otherwise uses `window.location.origin` in the browser.
 * - Falls back to the default production domain.
 */
export function getPublicSiteOrigin(): string {
  const fromEnv = import.meta.env.VITE_PUBLIC_SITE_URL;
  if (typeof fromEnv === "string" && fromEnv.trim()) {
    return fromEnv.replace(/\/$/, "");
  }
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return "https://resumerpg.app";
}
