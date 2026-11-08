#!/bin/sh
set -e

# OPENBTP_RUN_MIGRATIONS=1  apply prisma migrate deploy (default, keeps docker-compose behavior)
# OPENBTP_RUN_SEED=1        run prisma db seed (default, non-fatal)
# OPENBTP_START_APP=1       exec the Next.js server (set to 0 for a migration init container)
# OPENBTP_DB_WAIT_TIMEOUT   seconds to wait for MariaDB (default 900)
#
# Galera rejects GET_LOCK(). The chart sets PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK=1
# on the migration container. Do not unset that when the database is Galera.

CNF_FILE=/tmp/openbtp-client.cnf
META_FILE=/tmp/openbtp-db.meta
cleanup() {
  rm -f "$CNF_FILE"
}
trap cleanup EXIT

node /app/scripts/write-mariadb-client-cnf.mjs "$CNF_FILE" "$META_FILE"
# Meta file is generated with quoted safe tokens and does not contain the password.
# shellcheck disable=SC1090
. "$META_FILE"

echo "Waiting for database ${DB_HOST}:${DB_PORT}/${DB_NAME}..."
deadline=$(( $(date +%s) + ${OPENBTP_DB_WAIT_TIMEOUT:-900} ))
until mariadb --defaults-extra-file="$CNF_FILE" --skip-ssl -e "SELECT 1" >/dev/null 2>&1; do
  if [ "$(date +%s)" -ge "$deadline" ]; then
    echo "Database was not reachable before the wait timeout." >&2
    exit 1
  fi
  sleep 2
done
echo "Database is reachable"

if [ "$(id -u)" = "0" ]; then
  echo "Adjusting permissions on mounted directories..."
  mkdir -p \
    /app/public/uploads \
    /app/public/uploads/documents \
    /app/public/uploads/documents/administratifs \
    /app/public/uploads/documents/ouvriers \
    /app/public/uploads/documents/sav \
    /app/public/uploads/metres-plan \
    /app/public/uploads/choix-clients \
    /app/public/uploads/rapports \
    /app/public/chantiers \
    /app/public/documents \
    /app/backups || true
  chown -R nextjs:nodejs /app/public/uploads /app/public/chantiers /app/public/documents /app/backups 2>/dev/null || true
  chmod -R u+rwX,g+rwX,o+rX /app/public/uploads /app/public/chantiers /app/public/documents /app/backups 2>/dev/null || true
fi

TABLE_COUNT=$(mariadb --defaults-extra-file="$CNF_FILE" --skip-ssl -sN \
  -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${DB_NAME}'" 2>/dev/null || true)

SQL_FILE=""
for f in /app/init-db/*.sql; do
  [ -f "$f" ] && SQL_FILE="$f" && break
done

if [ "$TABLE_COUNT" = "0" ] && [ -n "$SQL_FILE" ]; then
  echo "Empty database detected. Importing $(basename "$SQL_FILE")..."
  mariadb --defaults-extra-file="$CNF_FILE" --skip-ssl "$DB_NAME" < "$SQL_FILE"
  echo "SQL import finished"
fi

export PATH="/app/node_modules/.bin:${PATH}"

if [ "${OPENBTP_RUN_MIGRATIONS:-1}" = "1" ]; then
  echo "Applying Prisma migrations..."
  migrate_output=$(prisma migrate deploy 2>&1) || {
    if echo "$migrate_output" | grep -q "P3005"; then
      echo "Existing schema detected (P3005). Checking it before baseline..."
      HAS_BON_PREPARATION=$(mariadb --defaults-extra-file="$CNF_FILE" --skip-ssl -sN \
        -e "SELECT 1 FROM information_schema.tables WHERE table_schema='${DB_NAME}' AND table_name='bon_preparation' LIMIT 1" 2>/dev/null || true)
      if [ -z "$HAS_BON_PREPARATION" ]; then
        echo "Table bon_preparation is absent. Refusing automatic baseline." >&2
        echo "$migrate_output" >&2
        exit 1
      fi
      echo "Schema looks consistent. Baselining migrations..."
      for dir in prisma/migrations/*/; do
        migration_name=$(basename "$dir")
        prisma migrate resolve --applied "$migration_name" 2>/dev/null || true
      done
      echo "Baseline finished. Re-running migrations..."
      prisma migrate deploy
    else
      echo "$migrate_output" >&2
      exit 1
    fi
  }
else
  echo "Skipping Prisma migrations"
fi

if [ "${OPENBTP_RUN_SEED:-1}" = "1" ]; then
  echo "Seeding reference data..."
  prisma db seed 2>&1 || echo "Seed skipped (non-fatal)"
else
  echo "Skipping seed"
fi

rm -f "$CNF_FILE"
trap - EXIT

if [ "${OPENBTP_START_APP:-1}" != "1" ]; then
  echo "Database init finished. Application start is disabled."
  exit 0
fi

echo "Starting application..."
if [ "$(id -u)" = "0" ]; then
  exec su -s /bin/sh -c "npm run start" nextjs
fi
exec npm run start
