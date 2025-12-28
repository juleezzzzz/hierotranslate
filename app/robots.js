// Next.js native robots.txt generation
// Ce fichier génère automatiquement /robots.txt

export default function robots() {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: [
                '/admin-signs',
                '/admin-gardiner',
                '/admin-hierotranslate-secret',
                '/administration-hierotranslate-secret',
                '/api/admin/',
            ],
        },
        sitemap: 'https://hierotranslate.com/sitemap.xml',
    };
}
