#!/usr/bin/env bash
set -euo pipefail

# Test unsigned Cloudinary upload from CLI.
# Requirements:
# - export CLOUDINARY_CLOUD_NAME=...
# - export CLOUDINARY_UPLOAD_PRESET=...
# - pass a file path as $1

FILE_PATH="${1:-}"
if [[ -z "${FILE_PATH}" ]]; then
  echo "Usage: CLOUDINARY_CLOUD_NAME=... CLOUDINARY_UPLOAD_PRESET=... $0 /path/to/file"
  exit 1
fi

if [[ -z "${CLOUDINARY_CLOUD_NAME:-}" || -z "${CLOUDINARY_UPLOAD_PRESET:-}" ]]; then
  echo "Missing CLOUDINARY_CLOUD_NAME or CLOUDINARY_UPLOAD_PRESET env vars."
  exit 1
fi

ENDPOINT="https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload"

curl -sS "${ENDPOINT}" \
  -F "file=@${FILE_PATH}" \
  -F "upload_preset=${CLOUDINARY_UPLOAD_PRESET}" \
  | python3 - <<'PY'
import json,sys
data=json.load(sys.stdin)
print("secure_url:", data.get("secure_url"))
print("public_id:", data.get("public_id"))
PY

