# NodeFlow Nginx Reverse Proxy with SSL

This directory contains the Docker configuration for NodeFlow's Nginx reverse proxy and web server. It handles SSL/TLS termination, serves static frontend components natively, and reverse proxies backend API and WebSocket connections.

## Architecture

- **HTTP (Port 80)**: Automatically redirects (301) to HTTPS (port 443). Handles `/.well-known/acme-challenge/` for ACME/Let's Encrypt certificate renewals.
- **HTTPS (Port 443)**: Reverse proxies traffic:
  - `/` -> Native static Single Page Application (React) with client-side SPA routing fallback (`try_files $uri $uri/ /index.html;`)
  - `/assets/` -> Static JS/CSS bundles with 1-year immutable caching
  - `/api/` -> `backend:8001` (FastAPI REST API)
  - `/user` -> `backend:8001` (User endpoint)
  - `/docs`, `/openapi.json`, `/redoc` -> `backend:8001` (FastAPI documentation)
  - `/socket.io/` -> `backend:8001` (Real-time Socket.IO WebSocket and long-polling)
  - `/healthz` -> Built-in HTTP 200 health check endpoint

## Configuration Layout

Nginx preserves the default `/etc/nginx/nginx.conf` provided by `nginx:alpine` and loads site configuration from `/etc/nginx/conf.d/nodeflow.conf`:
- `nginx.conf`: Unmodified official Nginx configuration (`include /etc/nginx/conf.d/*.conf;`)
- `conf.d/nodeflow.conf`: NodeFlow server blocks, SSL settings, upstreams, and location blocks
- `proxy_params`: Standard proxy headers (`Host`, `X-Real-IP`, `X-Forwarded-Proto`, etc.)

## SSL Certificates

### 1. Custom Certificates via Environment Variables
To point Nginx to custom certificate files anywhere on the host:
```ini
# in .env:
SERVER_NAME="nodeflow.example.com"
SSL_CERT_PATH="/etc/letsencrypt/live/nodeflow.example.com/fullchain.pem"
SSL_KEY_PATH="/etc/letsencrypt/live/nodeflow.example.com/privkey.pem"
```
When using `docker-compose.production.yaml`, these paths are automatically mounted into the container.

### 2. Custom Certificates in `./nginx/certs/`
Alternatively, you can place standard certificate files in `./nginx/certs/`:
- `cert.pem` (or `fullchain.pem` or `cert.crt`)
- `key.pem` (or `privkey.pem` or `key.key`)

Then restart the production stack:
```bash
docker compose -f docker-compose.production.yaml restart nginx
```

### 3. Automatic Self-Signed Certificates (Default)
When no certificates are provided, `40-ssl-certs.sh` automatically generates a 2048-bit RSA self-signed certificate on boot, valid for 365 days for `localhost`, `127.0.0.1`, and `${SERVER_NAME}`.

### 4. Manual Generation Script
Generate a self-signed certificate manually with custom domains:
```bash
./nginx/generate-certs.sh myserver.local 365
```
