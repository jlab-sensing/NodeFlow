#!/bin/sh
set -e

CERT_DIR="/etc/nginx/certs"
CERT_FILE="${CERT_DIR}/cert.pem"
KEY_FILE="${CERT_DIR}/key.pem"

mkdir -p "${CERT_DIR}"

# Check for existing certificate aliases if cert.pem / key.pem are absent
if [ ! -f "${CERT_FILE}" ]; then
    if [ -f "${CERT_DIR}/fullchain.pem" ]; then
        ln -sf "${CERT_DIR}/fullchain.pem" "${CERT_FILE}"
    elif [ -f "${CERT_DIR}/cert.crt" ]; then
        ln -sf "${CERT_DIR}/cert.crt" "${CERT_FILE}"
    fi
fi

if [ ! -f "${KEY_FILE}" ]; then
    if [ -f "${CERT_DIR}/privkey.pem" ]; then
        ln -sf "${CERT_DIR}/privkey.pem" "${KEY_FILE}"
    elif [ -f "${CERT_DIR}/key.key" ]; then
        ln -sf "${CERT_DIR}/key.key" "${KEY_FILE}"
    fi
fi

# Generate self-signed certificate if none exists
if [ ! -f "${CERT_FILE}" ] || [ ! -f "${KEY_FILE}" ]; then
    SERVER_NAME="${SERVER_NAME:-localhost}"
    echo "==> NodeFlow Nginx: No SSL certificate found at ${CERT_FILE}."
    echo "==> Generating self-signed certificate for '${SERVER_NAME}'..."

    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout "${KEY_FILE}" \
        -out "${CERT_FILE}" \
        -subj "/C=US/ST=CA/L=SantaCruz/O=NodeFlow/CN=${SERVER_NAME}" \
        -addext "subjectAltName=DNS:${SERVER_NAME},DNS:localhost,IP:127.0.0.1"

    chmod 644 "${CERT_FILE}"
    chmod 600 "${KEY_FILE}"
    echo "==> Self-signed certificate generated successfully at ${CERT_DIR}."
else
    echo "==> NodeFlow Nginx: Using existing SSL certificate at ${CERT_FILE}."
fi
