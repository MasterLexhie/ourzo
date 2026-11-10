#!/bin/sh
# Runs once, on first start of an empty dev volume (compose.dev.yaml).
# Creates the disposable e2e database; its name must end in "_test".
set -eu
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  -c "CREATE DATABASE ourzo_test OWNER \"$POSTGRES_USER\";"
