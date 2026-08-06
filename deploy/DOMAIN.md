# Domain: niveshguruji.com → VPS 103.20.235.196

## Server status (done on VPS)

- Docker **nginx** listens on **:80** and **:443** (httpd/web front door).
- Proxies `/` → web, `/api` → api, `/ws` → engine, `/health` → api.
- `server_name` includes `niveshguruji.com` and `www.niveshguruji.com`.
- ACME webroot ready at `/.well-known/acme-challenge/`.
- App env already uses `APP_BASE_URL=https://niveshguruji.com`.

The site loads today via IP: **http://103.20.235.196**

## Blocker: DNS zone not provisioned

Registrar: **Shock Hosting LLC**  
Delegated NS: `ns1.shockhosting.com` / `ns2.shockhosting.com`  

Those nameservers currently answer **REFUSED** for `niveshguruji.com` (no zone loaded).  
Public resolvers therefore return **SERVFAIL** — the domain cannot resolve until a zone exists.

This cannot be fixed from the unmanaged VPS alone. It requires one action in the **ShockHosting client area** (domain DNS).

## What you must do in ShockHosting panel

1. Log in to [ShockHosting client area](https://shockhosting.com) → **Domains** → `niveshguruji.com`.
2. Open **DNS Management** / **DNS Zone** (or “Manage DNS”).
   - If there is no zone yet: **Create DNS zone** / **Enable DNS hosting** for this domain.
   - Keep nameservers as `ns1.shockhosting.com` + `ns2.shockhosting.com` (already set at registry).
3. Set these records (replace any old A/CNAME pointing elsewhere):

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | `@` | `103.20.235.196` | 300 |
| A | `www` | `103.20.235.196` | 300 |

4. Remove conflicting records (old A to another IP, parking, wrong CNAME on `@`/`www`).
5. Wait 5–30 minutes, then verify:

```bash
dig +short niveshguruji.com A @8.8.8.8
# expect: 103.20.235.196
curl -sS -H 'Host: niveshguruji.com' http://103.20.235.196/health
curl -sS http://niveshguruji.com/health
```

## Enable HTTPS (run on VPS after DNS works)

```bash
cd /opt/simulatortrade_new/deploy

# Issue certificate (webroot — nginx stays up)
docker volume create certbot-certs
docker volume create certbot-www
mkdir -p /opt/simulatortrade_new/deploy/certbot-www

docker run --rm \
  -v certbot-certs:/etc/letsencrypt \
  -v /opt/simulatortrade_new/deploy/certbot-www:/var/www/certbot \
  certbot/certbot certonly --webroot -w /var/www/certbot \
  -d niveshguruji.com -d www.niveshguruji.com \
  --agree-tos -m admin@niveshguruji.com --non-interactive

# Point nginx at TLS config (edit docker-compose.yml nginx volumes):
#   - ./nginx/site.conf:/etc/nginx/conf.d/default.conf:ro
#   - certbot-certs:/etc/letsencrypt:ro
#   - ./certbot-www:/var/www/certbot:ro
# and add volume certbot-certs external:true

docker compose -f docker-compose.yml -f docker-compose.override.yml --env-file .env up -d nginx
curl -sS https://niveshguruji.com/health
```

Or use the helper: `sudo bash scripts/enable-https.sh` (after DNS resolves).

## Optional: Cloudflare instead of ShockHosting DNS

If ShockHosting DNS Management is missing/broken:

1. Create a Cloudflare account → Add site `niveshguruji.com` (Free).
2. Cloudflare shows two NS (e.g. `ada.ns.cloudflare.com`).
3. In ShockHosting domain settings → **Nameservers** → switch from ShockHosting NS to Cloudflare’s.
4. In Cloudflare DNS, add the same A records → `103.20.235.196` (proxy off / DNS-only while issuing Let’s Encrypt, or use Cloudflare origin cert later).
