/** @type {import('next').NextConfig} */
const nextConfig = {
  // Rediriger la racine vers index.html statique
  async rewrites() {
    return [
      {
        source: '/',
        destination: '/index.html',
      },
    ];
  },
};

export default nextConfig;
