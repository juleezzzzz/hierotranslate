import { NextResponse } from 'next/server';

export async function GET() {
    const baseUrl = 'https://hierotranslate.com';

    const robots = `# Robots.txt for Hierotranslate
User-agent: *
Allow: /

# Sitemap location
Sitemap: ${baseUrl}/sitemap.xml

# Disallow admin pages
Disallow: /admin-signs
Disallow: /admin-gardiner
Disallow: /admin-hierotranslate-secret
Disallow: /administration-hierotranslate-secret
Disallow: /api/admin/
`;

    return new NextResponse(robots, {
        headers: {
            'Content-Type': 'text/plain',
            'Cache-Control': 'public, max-age=86400',
        },
    });
}
