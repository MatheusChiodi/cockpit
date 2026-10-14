// Type-checks the project, then runs `claude plugin validate` on every mod and `claude plugin test` where tests exist.
// Usage: node scripts/check.mjs [mod ...]   (no names: every mod in mods.json)
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { json, loadCatalog, root } from './lib.mjs'

const wanted = process.argv.slice(2)
const names = loadCatalog()
  .mods.map(mod => mod.name)
  .filter(name => wanted.length === 0 || wanted.includes(name))

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

if (wanted.length === 0) {
  // Only the mods in the catalog: a mod still waiting in catalog-pending/ is checked when it lands.
  const dir = join(root, '.typecheck', 'all')
  mkdirSync(dir, { recursive: true })
  writeFileSync(
    join(dir, 'tsconfig.json'),
    json({
      extends: '../../tsconfig.json',
      include: ['../../engine-types', ...names.flatMap(name => ['hooks', 'types', 'tests'].map(part => `../../mods/${name}/${part}`))],
    }),
  )
  report('tsc', run('npx', ['tsc', '-p', join('.typecheck', 'all')]))
  rmSync(dir, { recursive: true, force: true })
  report('marketplace', run('claude', ['plugin', 'validate', '.']))
}

for (const name of names) {
  const dir = join('mods', name)
  report(`validate ${name}`, run('claude', ['plugin', 'validate', dir]))

  if (existsSync(join(root, dir, 'tests'))) {
    report(`test     ${name}`, run('claude', ['plugin', 'test', dir]))
  }
}

console.log(failures.length === 0 ? '\nAll good.' : `\n${failures.length} failure(s): ${failures.join(', ')}`)
process.exit(failures.length === 0 ? 0 : 1)
