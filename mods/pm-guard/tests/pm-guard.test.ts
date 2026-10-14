import { expect, test } from 'claude-code/testing'

const ANSWER = { result: { stdout: '', stderr: '', interrupted: false } }

// The engine resolves paths against the host: compare them as slashes.
const fileOf = (path: string) => path.replaceAll('\\', '/').split('/').pop() ?? ''

// A project at /work holding the lockfiles named in `files` (and a package.json with `manifest`).
const project = (on: any, files: string[], manifest = '{}') => {
  on('session.root', () => ({ value: '/work' }))
  on('fs.exists', (_: unknown, e: { path: string }) => ({ value: files.includes(fileOf(e.path)) }))
  on('fs.read', (_: unknown, e: { path: string }) =>
    fileOf(e.path) === 'package.json' ? { value: manifest } : { deny: 'ENOENT' },
  )
  on('tool.call', { tool: 'Bash' }, () => ANSWER)
  on('tool.call', { tool: 'PowerShell' }, () => ANSWER)
}

const bash = ($: any, command: string) => $.tool.call({ tool: 'Bash', command, tool_use_id: `b-${command}` })

test('refuses another package manager than the lockfile and names the right command', async ($, on) => {
  project(on, ['pnpm-lock.yaml'])

  const cases: [string, string][] = [
    ['npm install zod', 'pnpm add zod'],
    ['npm i', 'pnpm install'],
    ['npm ci', 'pnpm install --frozen-lockfile'],
    ['yarn add react -D', 'pnpm add react -D'],
    ['yarn', 'pnpm install'],
    ['cd app && npm run build', 'pnpm run build'],
    ['bun remove left-pad', 'pnpm remove left-pad'],
  ]

  for (const [command, fix] of cases) {
    const answer = await bash($, command)
    expect(answer.deny, command).toContain('pm-guard: this project uses pnpm (pnpm-lock.yaml)')
    expect(answer.deny, command).toContain(`Run "${fix}"`)
  }
})

test('lets the right manager, other subcommands and global installs through', async ($, on) => {
  project(on, ['pnpm-lock.yaml'])

  for (const command of ['pnpm install', 'pnpm add zod', 'npm view react version', 'npm install -g typescript', 'yarn dev', 'npx vitest', 'git status']) {
    expect((await bash($, command)).deny, command).toBeUndefined()
  }
})

test('the packageManager field wins and the PowerShell tool is covered', async ($, on) => {
  project(on, ['package-lock.json'], JSON.stringify({ packageManager: 'yarn@4.1.0' }))

  const answer = await $.tool.call({ tool: 'PowerShell', command: 'npm install zod', tool_use_id: 'p1' })
  expect(answer.deny).toContain('uses yarn (package.json packageManager)')
  expect(answer.deny).toContain('Run "yarn add zod"')
})

test('stays silent with no lockfile', async ($, on) => {
  project(on, [])
  expect((await bash($, 'npm install zod')).deny).toBeUndefined()
})

test('stays silent when two lockfiles leave the choice open', async ($, on) => {
  project(on, ['yarn.lock', 'package-lock.json'])
  expect((await bash($, 'pnpm install')).deny).toBeUndefined()
})

test('speaks the language set in the hub', async ($, on) => {
  project(on, ['yarn.lock'])
  // Stands in for the hub: answers the language it would hold.
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  const answer = await bash($, 'npm install zod')
  expect(answer.deny).toContain('pm-guard: este projeto usa yarn (yarn.lock); "npm install zod" geraria outro lockfile. Rode "yarn add zod".')
})
