import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const script = fileURLToPath(new URL('./write-mariadb-client-cnf.mjs', import.meta.url))

function run(databaseUrl) {
  const dir = mkdtempSync(join(tmpdir(), 'openbtp-cnf-'))
  const cnf = join(dir, 'client.cnf')
  const meta = join(dir, 'db.meta')
  const result = spawnSync(process.execPath, [script, cnf, meta], {
    env: { ...process.env, DATABASE_URL: databaseUrl },
    encoding: 'utf8',
  })
  const out = {
    status: result.status,
    stderr: result.stderr,
    cnf: result.status === 0 ? readFileSync(cnf, 'utf8') : '',
    meta: result.status === 0 ? readFileSync(meta, 'utf8') : '',
  }
  rmSync(dir, { recursive: true, force: true })
  return out
}

test('writes a client file and a password-free meta file', () => {
  const out = run('mysql://openbtp:s3cret@openbtp-mariadb-primary:3306/openbtp')
  assert.equal(out.status, 0)
  assert.match(out.cnf, /password="s3cret"/)
  assert.match(out.meta, /DB_HOST='openbtp-mariadb-primary'/)
  assert.match(out.meta, /DB_NAME='openbtp'/)
  assert.doesNotMatch(out.meta, /s3cret/)
  assert.doesNotMatch(out.stderr, /s3cret/)
})

test('decodes a URL-encoded password without putting it in the meta file', () => {
  const out = run('mysql://openbtp:p%40ss@db.example:3307/openbtp')
  assert.equal(out.status, 0)
  assert.match(out.cnf, /password="p@ss"/)
  assert.match(out.meta, /DB_PORT='3307'/)
  assert.doesNotMatch(out.meta, /p@ss/)
})

test('rejects a non-mysql URL and a database name that cannot be interpolated safely', () => {
  assert.notEqual(run('postgres://openbtp:s3cret@db:5432/openbtp').status, 0)
  assert.notEqual(run('mysql://openbtp:s3cret@db:3306/openbtp%27').status, 0)
  const missing = run('')
  assert.notEqual(missing.status, 0)
  assert.doesNotMatch(missing.stderr, /password/i)
})
