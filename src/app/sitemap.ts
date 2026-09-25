import type { MetadataRoute } from 'next'

/**
 * Next.js sitemap — auto-served at /sitemap.xml.
 *
 * Lists the public-facing pages only. Authenticated views (dashboard,
 * account, my-events) are SPA routes with no separate URL, so they are
 * excluded. Public share pages (/share/[eventCode]) are intentionally
 * omitted because each event's code is private until the organizer
 * publishes it — we don't want crawlers discovering unpublished events.
 *
 * lastModified dates reflect the last time the page CONTENT was meaningfully
 * changed — NOT the build date. Google uses these dates to decide when to
 * re-crawl: if a page hasn't changed, Google skips it, saving crawl budget.
 *
 * When you update a page's content, update its date here. Use ISO 8601
 * date strings (YYYY-MM-DD).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://tabletopprime.com'

  return [
    {
      url: baseUrl,
      // Home page: updated with SEO improvements (persona links, formats
      // section, closing CTA, stat row) — September 2026.
      lastModified: new Date('2026-09-21'),
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/organizer`,
      // Created September 2026 — persona landing page for organizers.
      lastModified: new Date('2026-09-21'),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/judge`,
      // Created September 2026 — persona landing page for judges.
      lastModified: new Date('2026-09-21'),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/player`,
      // Created September 2026 — persona landing page for players.
      lastModified: new Date('2026-09-21'),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/formats`,
      // Created September 2026 — formats explainer + comparison table + FAQ.
      lastModified: new Date('2026-09-21'),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/privacy`,
      // Updated September 2026 — AdSense compliance fixes (§8 rewritten,
      // "How Google uses data" callout added, EN/ES i18n with LegalPage).
      lastModified: new Date('2026-09-21'),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/terms`,
      // Updated September 2026 — date update + EN/ES i18n with LegalPage.
      lastModified: new Date('2026-09-21'),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/cookies`,
      // Updated September 2026 — AdSense compliance fixes (intro rewritten,
      // "do NOT use" card fixed, EN/ES i18n with LegalPage).
      lastModified: new Date('2026-09-21'),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/stats`,
      // Player statistics page — client-rendered, content depends on user
      // data. The page structure hasn't changed since the move from
      // account page. Use a stable date so Google doesn't re-crawl daily.
      lastModified: new Date('2026-08-15'),
      changeFrequency: 'weekly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/changelog`,
      // Updated September 2026 — various feature entries added
      // (seat rotation, diagnostics, Adjacent Swiss, SEO improvements).
      lastModified: new Date('2026-09-21'),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
  ]
}
