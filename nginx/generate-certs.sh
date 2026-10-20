#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CERT_DIR="${SCRIPT_DIR}/certs"
DOMAIN="${1:-localhost}"
DAYS="${2:-365}"

mkdir -p "${CERT_DIR}"

echo "Generating SSL certificate for domain: ${DOMAIN} (valid for ${DAYS} days)..."

openssl req -x509 -nodes -days "${DAYS}" -newkey rsa:2048 \
    -keyout "${CERT_DIR}/key.pem" \
    -out "${CERT_DIR}/cert.pem" \
    -subj "/C=US/ST=CA/L=SantaCruz/O=NodeFlow/CN=${DOMAIN}" \
    -addext "subjectAltName=DNS:${DOMAIN},DNS:localhost,IP:127.0.0.1"

chmod 644 "${CERT_DIR}/cert.pem"
chmod 600 "${CERT_DIR}/key.pem"

echo "Certificate generated successfully:"
echo "  Certificate: ${CERT_DIR}/cert.pem"
echo "  Private Key: ${CERT_DIR}/key.pem"
