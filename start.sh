#!/bin/sh
echo "Running database migrations..."
node dist/db/migrate.js 2>&1
echo "Starting application..."
exec node dist/index.js
