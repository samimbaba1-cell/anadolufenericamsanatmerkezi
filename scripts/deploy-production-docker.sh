#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

ENV_FILE="${ENV_FILE:-.env.docker}"
COMPOSE_FILES="-f docker-compose.yml -f docker-compose.prod.yml"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Ortam dosyası bulunamadı: $ENV_FILE" >&2
  echo "Örnek: cp .env.docker.example .env.docker && düzenleyin" >&2
  exit 1
fi

git pull --ff-only

docker compose $COMPOSE_FILES --env-file "$ENV_FILE" pull
docker compose $COMPOSE_FILES --env-file "$ENV_FILE" up -d --build

echo "Tamam. Durum: docker compose $COMPOSE_FILES --env-file $ENV_FILE ps"
