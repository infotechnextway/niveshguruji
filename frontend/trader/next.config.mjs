/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      { source: '/plans', destination: '/challenges', permanent: false },
      { source: '/resources', destination: '/', permanent: false },
    ];
  },
  async rewrites() {
    // Proxy API + WS to the backend in dev so the browser talks same-origin.
    const api = process.env.NEXT_PUBLIC_API_ORIGIN || 'http://localhost:4000';
    return [{ source: '/api/:path*', destination: `${api}/api/:path*` }];
  },
};
export default nextConfig;
