import { NextResponse } from 'next/server';

export async function GET() {
    const baseUrl = 'https://hierotranslate.com';

    // Pages statiques du site
    const staticPages = [
        { url: '/', priority: '1.0', changefreq: 'daily' },
        { url: '/#gardiner', priority: '0.9', changefreq: 'weekly' },
        { url: '/#discussion', priority: '0.7', changefreq: 'weekly' },
        { url: '/#exercices', priority: '0.8', changefreq: 'weekly' },
        { url: '/#sources', priority: '0.5', changefreq: 'monthly' },
    ];

    // Générer le XML du sitemap
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticPages.map(page => `  <url>
    <loc>${baseUrl}${page.url}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

    return new NextResponse(sitemap, {
        headers: {
            'Content-Type': 'application/xml',
            'Cache-Control': 'public, max-age=86400, s-maxage=86400',
        },
    });
}
