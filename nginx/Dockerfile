FROM nginx:alpine

# Install openssl for SSL certificate generation
RUN apk add --no-cache openssl

# Remove default configuration files
RUN rm -f /etc/nginx/conf.d/default.conf

# Copy reverse proxy configurations
COPY nginx.conf /etc/nginx/nginx.conf
COPY proxy_params /etc/nginx/proxy_params

# Copy entrypoint script for automatic SSL certificate setup
COPY 40-ssl-certs.sh /docker-entrypoint.d/40-ssl-certs.sh
RUN chmod +x /docker-entrypoint.d/40-ssl-certs.sh

EXPOSE 80 443
