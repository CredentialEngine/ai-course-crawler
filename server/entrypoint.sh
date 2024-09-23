#!/bin/sh
set -e

echo "Running migrations"
./node_modules/.bin/drizzle-kit migrate

chown -R pptruser:pptruser /app
chown -R pptruser:pptruser /app/db

exec runuser -u pptruser "$@"
