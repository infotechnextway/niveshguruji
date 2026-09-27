---
kind: external_dependency
name: Nginx — reverse proxy and TLS termination on the VPS
slug: nginx
category: external_dependency
category_hints:
    - vendor_identity
scope:
    - '**'
---

Nginx (`nginx:1.27-alpine`) is the edge container exposing ports 80/443 on the VPS. It terminates TLS (certificates mounted from the external `certbot-certs` volume) and proxies `/api/*` to the NestJS `api` process and `/ws` to the `engine` process. Configuration files `nginx.conf` and `site.conf` are bind-mounted read-only from `deploy/nginx/`.