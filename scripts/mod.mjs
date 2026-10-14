// The loop for working on ONE mod without touching the shared files:
// writes its manifests, type-checks it alone, validates it and runs its tests.
// The mod's catalog entry is read from mods.json or, while it is new, from catalog-parts/*.json.
// Usage: node scripts/mod.mjs <mod> [<mod> ...]
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { json, loadCatalog, loadParts, root, writeManifest } from './lib.mjs'

const names = process.argv.slice(2)

if (names.length === 0) {
  console.error('Usage: node scripts/mod.mjs <mod> [<mod> ...]')
  process.exit(2)
}

const catalog = loadCatalog()
const entries = new Map([...catalog.mods, ...loadParts()].map(mod => [mod.name, mod]))
const run = (command, args) =>
  spawnSync(command, args, { cwd: root, encoding: 'utf8', shell: process.platform === 'win32' })

let failed = 0
const report = (label, ran) => {
  const isOk = ran.status === 0
  console.log(`${isOk ? 'ok  ' : 'FAIL'} ${label}`)

  if (!isOk) {
    failed += 1
    console.log(`${ran.stdout}${ran.stderr}`.trim())
  }
}

for (const name of names) {
  const entry = entries.get(name)

  if (entry === undefined) {
    console.log(`FAIL ${name}: no catalog entry in mods.json or catalog-parts/`)
    failed += 1
    continue
  }

  writeManifest(catalog, entry)

  // A project of its own: this mod, the engine's types and the hub's state contract.
  const dir = join(root, '.typecheck', name)
  mkdirSync(dir, { recursive: true })
  writeFileSync(
    join(dir, 'tsconfig.json'),
    json({
      extends: '../../tsconfig.json',
      include: [
        '../../engine-types',
        '../../mods/cockpit/types',
        `../../mods/${name}/hooks`,
        `../../mods/${name}/types`,
        `../../mods/${name}/tests`,
      ],
    }),
  )
  report(`tsc      ${name}`, run('npx', ['tsc', '-p', join('.typecheck', name)]))
  rmSync(dir, { recursive: true, force: true })

  report(`validate ${name}`, run('claude', ['plugin', 'validate', join('mods', name)]))

  if (existsSync(join(root, 'mods', name, 'tests'))) {
    report(`test     ${name}`, run('claude', ['plugin', 'test', join('mods', name)]))
  }
}

process.exit(failed === 0 ? 0 : 1)
