// Type-check do projeto + `claude plugin validate` em cada mod + `claude plugin test` onde há testes.
// Uso: node scripts/check.mjs
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const catalog = JSON.parse(readFileSync(join(root, 'mods.json'), 'utf8'))
const run = (command, args) =>
  spawnSync(command, args, { cwd: root, encoding: 'utf8', shell: process.platform === 'win32' })

const failures = []
const report = (label, ran) => {
  const isOk = ran.status === 0
  console.log(`${isOk ? 'ok  ' : 'FAIL'} ${label}`)

  if (!isOk) {
    failures.push(label)
    console.log(`${ran.stdout}${ran.stderr}`.trim())
  }
}

report('tsc', run('npx', ['tsc', '-p', '.']))
report('marketplace', run('claude', ['plugin', 'validate', '.']))

for (const { name } of catalog.mods) {
  const dir = join('mods', name)
  report(`validate ${name}`, run('claude', ['plugin', 'validate', dir]))

  if (existsSync(join(root, dir, 'tests'))) {
    report(`test     ${name}`, run('claude', ['plugin', 'test', dir]))
  }
}

console.log(failures.length === 0 ? '\nTudo certo.' : `\n${failures.length} falha(s): ${failures.join(', ')}`)
process.exit(failures.length === 0 ? 0 : 1)
