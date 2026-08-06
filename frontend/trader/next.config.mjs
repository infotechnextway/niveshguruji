/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    // Proxy API + WS to the backend in dev so the browser talks same-origin.
    const api = process.env.NEXT_PUBLIC_API_ORIGIN || 'http://localhost:4000';
    const engine = process.env.ENGINE_ORIGIN || 'http://localhost:4100';
    return [
      { source: '/api/:path*', destination: `${api}/api/:path*` },
      // Same-origin WebSocket proxy for live quotes (matches prod nginx /ws).
      // Lets the browser reach the engine's /ws over the single web port, so
      // live market data works behind a single forwarded/proxied port.
      { source: '/ws', destination: `${engine}/ws` },
    ];
  },
};
export default nextConfig;
