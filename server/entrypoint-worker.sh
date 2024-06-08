#!/bin/sh
set -e

chown -R pptruser:pptruser /app
chown -R pptruser:pptruser /app/db

exec runuser -u pptruser "$@"
