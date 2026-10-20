# Nginx Reverse Proxy with SSL

This directory contains the Docker configuration for NodeFlow's Nginx reverse proxy. It terminates SSL/TLS and proxies incoming requests to the frontend and backend containers.

## Architecture

- **HTTP (Port 80)**: Redirects all requests to HTTPS (port 443). Also handles `/.well-known/acme-challenge/` for ACME/Let's Encrypt renewal.
- **HTTPS (Port 443)**: Reverse proxies traffic:
  - `/api/` &rarr; `backend:8001` (FastAPI backend)
  - `/user` &rarr; `backend:8001` (User endpoint)
  - `/docs`, `/openapi.json`, `/redoc` &rarr; `backend:8001` (Interactive API docs)
  - `/socket.io/` &rarr; `backend:8001` (Socket.IO WebSocket and long-polling)
  - `/` &rarr; `frontend:81` (React frontend SPA & Vite HMR)
  - `/healthz` &rarr; Built-in health check endpoint (HTTP 200)

## SSL Certificates

### Automatic Self-Signed Certificates
When the container starts, `40-ssl-certs.sh` checks for certificates in `/etc/nginx/certs/`:
- If `cert.pem` and `key.pem` are not present, a self-signed certificate valid for 365 days is **automatically generated**.
- The certificate includes SAN entries for `localhost` and `127.0.0.1` (or your configured `SERVER_NAME`).

### Custom Certificates
To use custom SSL certificates (such as from Let's Encrypt or a CA):
1. Place your certificate files in `./nginx/certs/`:
   - `cert.pem` (or `fullchain.pem` or `cert.crt`)
   - `key.pem` (or `privkey.pem` or `key.key`)
2. Restart the Nginx container:
   ```bash
   docker compose restart nginx
   ```

### Manual Generation Script
You can also generate new self-signed certificates with custom domain and validity using the helper script:
```bash
./nginx/generate-certs.sh [domain] [days]
# Example:
./nginx/generate-certs.sh myserver.local 365
```
