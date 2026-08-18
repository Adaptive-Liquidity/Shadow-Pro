#!/usr/bin/env bash
set -euo pipefail

matches="$(grep -RInE \
  --exclude-dir=.git \
  --exclude-dir=target \
  --exclude-dir=node_modules \
  --exclude='*.lock' \
  --exclude='check_secrets.sh' \
  '(-----BEGIN ([A-Z ]+ )?PRIVATE KEY-----|ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9]{20,}|AIza[0-9A-Za-z_-]{20,}|PRIVATE_KEY[[:space:]]*=[^[:space:]]+|SECRET(_KEY)?[[:space:]]*=[^[:space:]]+)' \
  . || true)"

if [[ -n "$matches" ]]; then
  echo "Potential credential material detected:" >&2
  echo "$matches" >&2
  exit 1
fi

if find . -path './.git' -prune -o -path './target' -prune -o -path './composer/node_modules' -prune -o \( -name '*.pem' -o -name '*.key' -o -name '*.keypair.json' \) -print | grep -q .; then
  echo "Private-key-like file detected in repository tree." >&2
  exit 1
fi

echo "No configured credential patterns detected."
