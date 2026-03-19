#!/bin/sh
echo "Running database migrations..."
npx drizzle-kit migrate 2>&1 || echo "Migration warning (may already be applied)"
echo "Starting application..."
exec node dist/index.js
