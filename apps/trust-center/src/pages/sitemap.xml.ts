import type { APIRoute } from 'astro';

/**
 * Sitemap generator for TEEI Trust Center
 * Generates XML sitemap for all trust center pages
 */

interface SitemapEntry {
  url: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
}

export const GET: APIRoute = ({ site }) => {
  // Base URL for the trust center (use site config or fallback)
  const baseUrl = site?.toString() || 'https://trust.teei-platform.com';

  // Get current date in ISO format for lastmod
  const lastmod = new Date().toISOString().split('T')[0];

  // Define all trust center pages
  const pages: SitemapEntry[] = [
    {
      url: '/',
      lastmod,
      changefreq: 'monthly',
      priority: 1.0,
    },
    {
      url: '/status',
      lastmod,
      changefreq: 'hourly',
      priority: 0.9,
    },
    {
      url: '/security',
      lastmod,
      changefreq: 'monthly',
      priority: 0.8,
    },
    {
      url: '/privacy',
      lastmod,
      changefreq: 'monthly',
      priority: 0.8,
    },
    {
      url: '/ai-transparency',
      lastmod,
      changefreq: 'monthly',
      priority: 0.8,
    },
    {
      url: '/sub-processors',
      lastmod,
      changefreq: 'monthly',
      priority: 0.7,
    },
    {
      url: '/incidents',
      lastmod,
      changefreq: 'weekly',
      priority: 0.7,
    },
  ];

  // Generate XML sitemap
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
                            http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${pages
  .map(
    (page) => `  <url>
    <loc>${baseUrl}${page.url}</loc>
    <lastmod>${page.lastmod}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`;

  return new Response(sitemap, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      'X-Robots-Tag': 'all',
    },
  });
};
