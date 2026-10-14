// Lands new mods one at a time: each mod gets its catalog entry, a build, its own check, one commit and one push.
// Entries wait in catalog-pending/*.json (arrays, same shape as mods.json entries).
// A mod that fails its check, or has no test, stays pending and is reported.
// Usage: node scripts/land.mjs [mod ...]   (no names: every pending mod)
//        add --no-push to commit without pushing
import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { json, loadCatalog, root, text } from './lib.mjs'

const args = process.argv.slice(2)
const shouldPush = !args.includes('--no-push')
const wanted = args.filter(arg => !arg.startsWith('--'))
const pendingDir = join(root, 'catalog-pending')

const run = (command, argv) =>
  spawnSync(command, argv, { cwd: root, encoding: 'utf8', shell: process.platform === 'win32' })

// git gets its arguments untouched by a shell: a commit message has spaces and parentheses.
const git = (...argv) => spawnSync('git', argv, { cwd: root, encoding: 'utf8' })

const files = existsSync(pendingDir) ? readdirSync(pendingDir).filter(name => name.endsWith('.json')) : []
const pending = files.flatMap(file =>
  JSON.parse(readFileSync(join(pendingDir, file), 'utf8')).map(entry => ({ file, entry })),
)

const hasTest = name => {
  const dir = join(root, 'mods', name, 'tests')

  return existsSync(dir) && readdirSync(dir).some(file => /\.test\.tsx?$/.test(file))
}

// The slash commands a mod registers with a literal name.
const commandsOf = name => {
  const dir = join(root, 'mods', name, 'hooks')
  const file = ['register.tsx', 'register.ts'].map(one => join(dir, one)).find(existsSync)

  return file === undefined
    ? []
    : [...readFileSync(file, 'utf8').matchAll(/command\.register\(\{\s*name:\s*'([^']+)'/g)].map(match => match[1])
}

// Takes the landed entry out of its pending file; an emptied file is removed.
const settle = (file, name) => {
  const path = join(pendingDir, file)
  const rest = JSON.parse(readFileSync(path, 'utf8')).filter(entry => entry.name !== name)

  if (rest.length === 0) {
    rmSync(path)
  } else {
    writeFileSync(path, json(rest))
  }
}

// Attribution lines for the commits; COMMIT_TRAILER in the environment replaces the default.
const TRAILER =
  process.env.COMMIT_TRAILER ??
  'Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>\nClaude-Session: https://claude.ai/code/session_01ThD3bYRjgSQpn7hvv9zYRm'

const landed = []
const held = []

for (const { file, entry } of pending) {
  const { name } = entry

  if (wanted.length > 0 && !wanted.includes(name)) {
    continue
  }

  const catalog = loadCatalog()

  if (catalog.mods.some(mod => mod.name === name)) {
    settle(file, name)
    continue
  }

  if (!hasTest(name)) {
    held.push(`${name}: no test`)
    continue
  }

  if (catalog.categories[entry.category] === undefined) {
    held.push(`${name}: unknown category "${entry.category}"`)
    continue
  }

  // Two mods answering the same slash command would fight over it.
  const taken = new Map(catalog.mods.flatMap(mod => commandsOf(mod.name).map(command => [command, mod.name])))
  const clash = commandsOf(name).find(command => taken.has(command))

  if (clash !== undefined) {
    held.push(`${name}: /${clash} is already registered by ${taken.get(clash)}`)
    continue
  }

  // The check reads the entry from the catalog, so it goes in first and comes out again on failure.
  writeFileSync(join(root, 'mods.json'), json({ ...catalog, mods: [...catalog.mods, entry] }))
  const checked = run('node', ['scripts/mod.mjs', name])

  if (checked.status !== 0) {
    writeFileSync(join(root, 'mods.json'), json(catalog))
    held.push(`${name}: ${`${checked.stdout}${checked.stderr}`.trim().split('\n').slice(0, 12).join('\n  ')}`)
    continue
  }

  const built = run('npm', ['run', 'build', '--silent'])

  if (built.status !== 0) {
    writeFileSync(join(root, 'mods.json'), json(catalog))
    held.push(`${name}: build failed\n  ${built.stderr.trim().split('\n').slice(0, 8).join('\n  ')}`)
    continue
  }

  settle(file, name)
  git('add', `mods/${name}`, 'mods.json', 'README.md', 'README.pt-BR.md', 'README.es.md', 'docs', '.claude-plugin', 'mods/cockpit/hooks/panels.ts')
  const committed = git('commit', '-q', '-m', `feat(${entry.category}): add ${name}`, '-m', `${text(entry.description)}.`, '-m', TRAILER)

  if (committed.status !== 0) {
    held.push(`${name}: commit failed\n  ${`${committed.stdout}${committed.stderr}`.trim()}`)
    continue
  }

  if (shouldPush) {
    const pushed = git('push', '-q', 'origin', 'HEAD')

    if (pushed.status !== 0) {
      held.push(`${name}: committed, push failed\n  ${pushed.stderr.trim()}`)
      continue
    }
  }

  landed.push(name)
  console.log(`landed ${name}`)
}

console.log(`\n${landed.length} landed, ${held.length} held back`)

for (const line of held) {
  console.log(`- ${line}`)
}

process.exit(held.length === 0 ? 0 : 1)
