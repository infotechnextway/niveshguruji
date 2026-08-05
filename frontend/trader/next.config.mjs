/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Smaller self-contained build for cPanel / VPS Node hosting.
  output: 'standalone',
  async rewrites() {
    // Proxy API + WS to the backend in dev so the browser talks same-origin.
    const api = process.env.NEXT_PUBLIC_API_ORIGIN || 'http://localhost:4000';
    return [{ source: '/api/:path*', destination: `${api}/api/:path*` }];
  },
};
export default nextConfig;
