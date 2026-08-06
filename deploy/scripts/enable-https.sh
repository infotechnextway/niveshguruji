#!/usr/bin/env bash
# Issue Let's Encrypt certs and flip nginx to TLS for niveshguruji.com.
# Prerequisites: DNS A records for @ and www → this VPS (see DOMAIN.md).
set -euo pipefail

DOMAIN="${DOMAIN:-niveshguruji.com}"
EMAIL="${EMAIL:-admin@${DOMAIN}}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEPLOY="$ROOT/deploy"
COMPOSE=(docker compose -f "$DEPLOY/docker-compose.yml")
if [[ -f "$DEPLOY/docker-compose.override.yml" ]]; then
  COMPOSE+=(-f "$DEPLOY/docker-compose.override.yml")
fi
COMPOSE+=(--env-file "$DEPLOY/.env")

cd "$DEPLOY"
mkdir -p certbot-www
docker volume create certbot-certs >/dev/null

echo "Checking DNS for ${DOMAIN}..."
RESOLVED="$(dig +short "$DOMAIN" A @8.8.8.8 | head -1 || true)"
VPS_IP="$(curl -4 -sS ifconfig.me || curl -4 -sS icanhazip.com || true)"
if [[ -z "$RESOLVED" ]]; then
  echo "ERROR: ${DOMAIN} does not resolve yet. Create the ShockHosting DNS zone / A records first (DOMAIN.md)."
  exit 1
fi
echo "DNS ${DOMAIN} → ${RESOLVED} (VPS public IP ≈ ${VPS_IP:-unknown})"

echo "Requesting certificate..."
docker run --rm \
  -v certbot-certs:/etc/letsencrypt \
  -v "$DEPLOY/certbot-www:/var/www/certbot" \
  certbot/certbot certonly --webroot -w /var/www/certbot \
  -d "$DOMAIN" -d "www.$DOMAIN" \
  --agree-tos -m "$EMAIL" --non-interactive --keep-until-expiring

# Patch compose nginx volumes to TLS if still on HTTP config
if grep -q 'site.http.conf' "$DEPLOY/docker-compose.yml"; then
  python3 - <<'PY'
from pathlib import Path
p = Path("/opt/simulatortrade_new/deploy/docker-compose.yml")
if not p.exists():
    p = Path("docker-compose.yml")
text = p.read_text()
old = """      - ./nginx/site.http.conf:/etc/nginx/conf.d/default.conf:ro
      - ./certbot-www:/var/www/certbot:ro"""
new = """      - ./nginx/site.conf:/etc/nginx/conf.d/default.conf:ro
      - certbot-certs:/etc/letsencrypt:ro
      - ./certbot-www:/var/www/certbot:ro"""
if old not in text:
    raise SystemExit("docker-compose.yml nginx volumes not in expected HTTP shape — edit manually per DOMAIN.md")
text = text.replace(old, new, 1)
if "certbot-certs:" not in text.split("volumes:")[-1]:
    text = text.rstrip() + "\n  certbot-certs:\n    external: true\n    name: certbot-certs\n"
p.write_text(text + ("" if text.endswith("\n") else "\n"))
print("Patched docker-compose.yml → TLS nginx mounts")
PY
fi

"${COMPOSE[@]}" up -d nginx
sleep 2
curl -fsS "https://${DOMAIN}/health" && echo && echo "HTTPS OK: https://${DOMAIN}"
