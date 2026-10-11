/**
 * ADR-0032 · origins of the site servers. Development defaults keep the three origins apart so the browser never sends
 * the app's cookie to them: app on 127.0.0.1, public sites on `<slug>.localhost`, preview on 127.0.0.2. The production
 * publication domain is an owner decision (EXT-REQ-07) and is not configured here.
 */
export function siteConfig() {
  const publicBase = (process.env.BRANDOPOLIS_SITES_BASE ?? 'localhost:3100').trim().toLowerCase();
  const previewOrigin = (process.env.BRANDOPOLIS_PREVIEW_ORIGIN ?? 'http://127.0.0.2:3200').trim().replace(/\/$/, '');
  const appOrigin = (process.env.BRANDOPOLIS_APP_ORIGIN ?? 'http://127.0.0.1:3000').trim().replace(/\/$/, '');
  const secure = previewOrigin.startsWith('https://');
  return { publicBase, previewOrigin, appOrigin, secure, publicScheme: secure ? 'https' : 'http' };
}
/** Brandopolis address of a site: `<slug>.<publicBase>`. */
export const brandopolisHost = (slug: string) => `${slug}.${siteConfig().publicBase}`;
