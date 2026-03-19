#!/bin/sh
set -e
echo "Running database migrations..."
node dist/db/migrate.js
echo "Migrations complete. Starting application..."
exec node dist/index.js
