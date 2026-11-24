#
# Stage 1: Build Frontend Static Assets
#
FROM node:22.19.0-bullseye-slim AS frontend-builder

WORKDIR /app

# Install dependencies with clean cache
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

# Copy frontend source files
COPY frontend/ ./

# VITE_API_BASE_URL is set to empty string so API calls use relative paths (/api/...)
ENV VITE_API_BASE_URL=""
RUN npm run build

#
# Stage 2: Final Nginx Production Image
#
FROM nginx:alpine

# Install OpenSSL for SSL certificate automation
RUN apk add --no-cache openssl

# Remove default welcome site, but KEEP /etc/nginx/nginx.conf untouched
RUN rm -f /etc/nginx/conf.d/default.conf && rm -rf /usr/share/nginx/html/*

# Embed the compiled static frontend files into webroot
COPY --from=frontend-builder /app/dist /usr/share/nginx/html

# Copy modular site configuration into conf.d/
COPY nginx/conf.d/nodeflow.conf /etc/nginx/conf.d/nodeflow.conf
COPY nginx/proxy_params /etc/nginx/proxy_params

# Copy SSL bootstrap script to docker entrypoint
COPY nginx/40-ssl-certs.sh /docker-entrypoint.d/40-ssl-certs.sh
RUN chmod +x /docker-entrypoint.d/40-ssl-certs.sh

EXPOSE 80 443
