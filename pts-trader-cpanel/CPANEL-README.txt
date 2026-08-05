RIDGELINE trader — cPanel / Hostinger Node.js upload
====================================================

REQUIREMENTS
- cPanel "Setup Node.js App" (Node 18+ recommended)
- This is the FRONTEND only. Login needs a separate API host.
  Demo dashboard works without API.

UPLOAD
1. In File Manager, go to your Node app folder (or create one, e.g. home/pts-trader).
2. Upload pts-trader-cpanel.zip and Extract.
3. Files should include: server.js, package.json, .next/, public/, node_modules/

NODE.JS APP SETTINGS
- Application root: folder where you extracted (contains server.js)
- Application startup file: server.js
- Application URL / port: let cPanel assign PORT
- Node version: 18.x or 20.x

ENVIRONMENT (optional, for real API later)
- NEXT_PUBLIC_API_ORIGIN=https://your-api.example.com
- NEXT_PUBLIC_WS_URL=wss://your-api.example.com/ws
  (Client env is baked at build time; rebuild if you change these.)

START
- Click "Run NPM Install" if cPanel offers it (optional — node_modules is included).
- Restart the Node application.
- Open your site URL → /login → "Try the demo dashboard".

NOTES
- Do NOT extract only into public_html as static files — Next.js needs Node.
- Shared hosting without Node.js App cannot run this zip.
