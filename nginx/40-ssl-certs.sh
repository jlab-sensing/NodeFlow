#!/bin/sh
set -e

CERT_DIR="/etc/nginx/certs"
CERT_FILE="${CERT_DIR}/cert.pem"
KEY_FILE="${CERT_DIR}/key.pem"

mkdir -p "${CERT_DIR}"

# 1. Check if external custom certificate paths were mounted and are valid non-empty files
if [ -s "${CERT_DIR}/external_cert.pem" ] && [ ! -d "${CERT_DIR}/external_cert.pem" ]; then
    echo "==> NodeFlow Nginx: Using custom SSL certificate from SSL_CERT_PATH."
    ln -sf "${CERT_DIR}/external_cert.pem" "${CERT_FILE}"
fi

if [ -s "${CERT_DIR}/external_key.pem" ] && [ ! -d "${CERT_DIR}/external_key.pem" ]; then
    echo "==> NodeFlow Nginx: Using custom SSL private key from SSL_KEY_PATH."
    ln -sf "${CERT_DIR}/external_key.pem" "${KEY_FILE}"
fi

# 2. Check for existing standard aliases in CERT_DIR
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

# 3. Generate self-signed certificate if none exists
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
    echo "==> NodeFlow Nginx: SSL certificate ready at ${CERT_FILE}."
fi
