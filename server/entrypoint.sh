#!/bin/sh
set -e

if [ ! -f "$DATABASE_URL" ]; then
  echo "Creating database"
  ./node_modules/.bin/drizzle-kit generate:sqlite
fi
echo "Running migrations"
node dist/migrate.js

chown -R pptruser:pptruser /app
chown -R pptruser:pptruser /app/db

exec runuser -u pptruser "$@"
