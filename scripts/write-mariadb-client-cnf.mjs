#!/usr/bin/env node
/**
 * Build a MariaDB client defaults file from DATABASE_URL.
 *
 * The password is written only to the cnf file (mode 0600). The companion
 * meta file is safe to source from a shell and never contains the password.
 *
 * Usage:
 *   node scripts/write-mariadb-client-cnf.mjs <cnf-path> <meta-path>
 */

import { writeFileSync } from 'node:fs'

const cnfPath = process.argv[2]
const metaPath = process.argv[3]

if (!cnfPath || !metaPath) {
  console.error('usage: write-mariadb-client-cnf.mjs <cnf-path> <meta-path>')
  process.exit(2)
}

const raw = process.env.DATABASE_URL
if (!raw) {
  console.error('DATABASE_URL is not set')
  process.exit(1)
}

let parsed
try {
  parsed = new URL(raw)
} catch {
  console.error('DATABASE_URL is not a valid URL')
  process.exit(1)
}

if (parsed.protocol !== 'mysql:') {
  console.error('DATABASE_URL must use the mysql:// scheme')
  process.exit(1)
}

const user = decodeURIComponent(parsed.username || '')
const password = decodeURIComponent(parsed.password || '')
const host = parsed.hostname
const port = parsed.port || '3306'
const database = decodeURIComponent((parsed.pathname || '').replace(/^\//, '').split('/')[0] || '')

if (!user || !host || !database) {
  console.error('DATABASE_URL is missing a user, host, or database name')
  process.exit(1)
}

if (!/^[A-Za-z0-9_-]+$/.test(database)) {
  console.error('Database name must contain only letters, digits, underscore, or hyphen')
  process.exit(1)
}

if (!/^[A-Za-z0-9_.:-]+$/.test(host)) {
  console.error('Database host contains unsupported characters')
  process.exit(1)
}

if (!/^\d+$/.test(port)) {
  console.error('Database port is not numeric')
  process.exit(1)
}

function cnfQuote(value) {
  return `"${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r?\n/g, '')}"`
}

function shellQuote(value) {
  if (!/^[A-Za-z0-9_.:-]+$/.test(value)) {
    console.error('Refusing to write a shell meta value with unsupported characters')
    process.exit(1)
  }
  return `'${value}'`
}

const cnf = [
  '[client]',
  `host=${cnfQuote(host)}`,
  `port=${port}`,
  `user=${cnfQuote(user)}`,
  `password=${cnfQuote(password)}`,
  `database=${cnfQuote(database)}`,
  '',
].join('\n')

writeFileSync(cnfPath, cnf, { mode: 0o600 })
writeFileSync(
  metaPath,
  [
    `DB_HOST=${shellQuote(host)}`,
    `DB_PORT=${shellQuote(port)}`,
    `DB_USER=${shellQuote(user)}`,
    `DB_NAME=${shellQuote(database)}`,
    '',
  ].join('\n'),
  { mode: 0o600 },
)
