# ShockHosting full-stack deploy (2 GB KVM)

Runs **nginx + Next.js (web) + api + engine + Redis** on the VPS.  
**MongoDB stays on Atlas** — do not install Mongo on a 2 GB box.

```
Browser → nginx:80/443
           ├─ /        → web:3000
           ├─ /api/    → api:4000
           ├─ /ws      → engine:4100
           └─ /health  → api:4000
```

## 0. Order the VPS

1. ShockHosting **SSD-KVM-2GB** (or larger), **Ubuntu 22.04 or 24.04**.
2. Firewall / security group: allow **22, 80, 443**.
3. Note the public IP.

## 1. First SSH hardening + swap (required on 2 GB)

```bash
sudo apt update && sudo apt upgrade -y

# 2 GB swap — prevents OOM during docker build
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
free -h
```

## 2. Install Docker Engine + Compose plugin

```bash
sudo apt install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker "$USER"
# log out and back in, then:
docker run --rm hello-world
```

## 3. MongoDB Atlas

1. Create a free/shared cluster; database user + password.
2. Network Access → add the **VPS public IP**.
3. Connect → Drivers → copy SRV URI into `MONGO_URI` (include `/pts` or your DB name).

## 4. Clone and configure

```bash
git clone https://github.com/infotechnextway/simulatortrade_new.git
cd simulatortrade_new/deploy
cp .env.example .env
```

Fill `.env` at minimum:

| Variable | Example (HTTP first boot) |
|---|---|
| `MONGO_URI` | Atlas SRV string |
| `APP_BASE_URL` | `http://YOUR_VPS_IP` |
| `CORS_ORIGINS` | `http://YOUR_VPS_IP` |
| `JWT_*` | from keygen below |
| `OTP_PEPPER` | `openssl rand -hex 24` |
| `DATA_ENC_SECRET` | `openssl rand -hex 32` |
| `MARKET_FEED` | `simulator` |
| `SMS_PROVIDER` / `MAIL_PROVIDER` | `console` until SMS/SMTP ready |

Generate JWT keys on any machine with the repo (or on the VPS after installing Node):

```bash
cd ../backend && npm ci && npm run generate:keys
# paste JWT_PRIVATE_KEY_B64 and JWT_PUBLIC_KEY_B64 into deploy/.env
cd ../deploy
```

Leave `NEXT_PUBLIC_API_ORIGIN` and `NEXT_PUBLIC_WS_URL` **empty** so the browser uses same-origin `/api` and `/ws` through nginx.

## 5. First boot (HTTP)

Compose defaults to [nginx/site.http.conf](nginx/site.http.conf) (no TLS, no cert volume).

```bash
# On 2 GB, build one image at a time if a full build OOMs:
docker compose build api
docker compose build engine
docker compose build web
docker compose up -d

docker compose ps
curl -sS http://YOUR_VPS_IP/health
```

Open `http://YOUR_VPS_IP/login` → **Try the demo dashboard**, or sign in after bootstrap.

### Bootstrap seed (config + admin/trader)

Easiest from a machine with Node 20 (laptop or the VPS):

```bash
cd ../backend
cp ../deploy/.env .env   # or export MONGO_URI=... and the JWT/OTP secrets
npm ci
npm run bootstrap:dev    # config + starter instruments + dev trader
# optional dedicated seeds:
# npm run seed:config
# npm run seed:admin
# npm run seed:trader
```

Dev trader credentials are documented in `frontend/trader/.env.example` / bootstrap output (typically `trader@test.local`). Create/verify admin via `npm run seed:admin` before sharing the URL.

## 6. Domain + HTTPS (after DNS)

1. Point domain **A record** → VPS IP; wait for DNS.
2. Update `.env`:

```env
APP_BASE_URL=https://YOUR_DOMAIN
CORS_ORIGINS=https://YOUR_DOMAIN
```

3. Issue cert (stop nginx briefly so certbot can bind :80, or use a temporary standalone run):

```bash
docker compose stop nginx
docker volume create certbot-certs
docker run --rm -p 80:80 \
  -v certbot-certs:/etc/letsencrypt \
  certbot/certbot certonly --standalone \
  -d YOUR_DOMAIN --agree-tos -m you@YOUR_DOMAIN --non-interactive
```

4. Point nginx at TLS config — edit [docker-compose.yml](docker-compose.yml) `nginx.volumes` to:

```yaml
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/site.conf:/etc/nginx/conf.d/default.conf:ro
      - certbot-certs:/etc/letsencrypt:ro
```

And under `volumes:` add:

```yaml
  certbot-certs:
    external: true
    name: certbot-certs
```

5. Replace domain placeholder:

```bash
sed -i 's/YOUR_DOMAIN/your.actual.domain/g' nginx/site.conf
docker compose up -d
curl -sS https://YOUR_DOMAIN/health
```

6. Rebuild web only if you later set non-empty `NEXT_PUBLIC_*` build args:

```bash
docker compose build web && docker compose up -d web nginx
```

### Cert renewals

```bash
docker compose stop nginx
docker run --rm -p 80:80 -v certbot-certs:/etc/letsencrypt certbot/certbot renew
docker compose start nginx
```

## 7. Smoke checklist

- [ ] `docker compose ps` — redis, api, engine, web, nginx healthy/up  
- [ ] `GET /health` → ok  
- [ ] UI loads at `/login`  
- [ ] Demo dashboard works  
- [ ] Real login works after bootstrap  
- [ ] (Live feed) Admin → Dhan/Upstox tokens; or keep `MARKET_FEED=simulator`

## 2 GB survival rules

- Never run Mongo on this VPS  
- Keep swap enabled  
- Prefer `MARKET_FEED=simulator` until tokens are configured  
- If `docker compose build` OOMs: build `api` → `engine` → `web` separately  
- Upgrade to **4 GB** before many concurrent WebSocket traders  

## Useful commands

```bash
cd /opt/simulatortrade_new/deploy
docker compose logs -f api engine web nginx
docker compose restart api engine
docker compose down              # stop stack (keeps volumes)
docker compose up -d --build     # rebuild + start
```

## Auto-deploy (GitHub Actions)

On every push to `main`, `.github/workflows/deploy-vps.yml` SSHs into this VPS, pulls `main`, and runs `docker compose build && up -d`.

### One-time GitHub secrets

Repo → **Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Value |
|---|---|
| `VPS_HOST` | `103.20.235.196` |
| `VPS_USER` | `root` |
| `VPS_SSH_KEY` | contents of `/root/github-actions-deploy.pem` on the VPS |

```bash
ssh root@103.20.235.196 'cat /root/github-actions-deploy.pem'
```

Paste the full key (including `BEGIN` / `END` lines) into `VPS_SSH_KEY`.

Manual run: **Actions → Deploy VPS → Run workflow**.
