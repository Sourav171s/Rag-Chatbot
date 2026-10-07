#!/bin/sh
set -e

echo "🔄 Running database migrations..."
node dist/db/migrate.js

# A freshly created Docker network can need a few seconds before external DNS
# works (getaddrinfo EAI_AGAIN). Wait for it (at most 30s, no API calls) so
# seeding does not fail just because the container started too early.
wait_for_gemini_dns() {
  deadline=$(( $(date +%s) + 30 ))
  # Each lookup gets at most 2s, so a hanging resolver cannot stretch the wait
  until node -e "setTimeout(() => process.exit(1), 2000); require('dns').lookup('generativelanguage.googleapis.com', e => process.exit(e ? 1 : 0))"; do
    if [ "$(date +%s)" -ge "$deadline" ]; then
      echo "⚠️  Could not resolve generativelanguage.googleapis.com after 30s; seeding will likely fail."
      return 0
    fi
    [ -n "${dns_waiting:-}" ] || echo "⏳ Waiting for DNS to resolve generativelanguage.googleapis.com..."
    dns_waiting=1
    sleep 1
  done
}

# Optional seeding - controlled by RUN_SEED environment variable
if [ "${RUN_SEED}" = "true" ]; then
  wait_for_gemini_dns
  echo "🌱 Seeding database with markdown documents..."
  # Seeding is idempotent (already-embedded files are skipped). A failure here
  # must not crash-loop the container, which would re-call the Gemini API on
  # every restart, so the API still starts and the error stays in the logs.
  if ! node dist/db/seed-embeddings.js; then
    echo "⚠️  Seeding failed (see error above). The API will start anyway."
    echo "   Fix the problem, then run: docker compose exec backend node dist/db/seed-embeddings.js"
  fi
else
  echo "⏭️  Skipping database seeding (set RUN_SEED=true to enable)"
fi

echo "🚀 Starting application..."
exec node dist/index.js

