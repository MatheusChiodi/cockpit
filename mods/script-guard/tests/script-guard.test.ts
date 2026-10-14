import { expect, test } from 'claude-code/testing'

const ANSWER = { result: { stdout: '', stderr: '', interrupted: false } }

const fileOf = (path: string) => path.replaceAll('\\', '/').split('/').pop() ?? ''

// A project at /work whose package.json is `manifest` (none when undefined).
const project = (on: any, manifest: string | undefined) => {
  on('session.root', () => ({ value: '/work' }))
  on('fs.read', (_: unknown, e: { path: string }) =>
    manifest !== undefined && fileOf(e.path) === 'package.json' ? { value: manifest } : { deny: 'ENOENT' },
  )
  on('tool.call', { tool: 'Bash' }, () => ANSWER)
  on('tool.call', { tool: 'PowerShell' }, () => ANSWER)
}

const PACKAGE = JSON.stringify({ scripts: { dev: 'vite', build: 'tsc', test: 'vitest', 'build:prod': 'vite build' } })

const bash = ($: any, command: string) => $.tool.call({ tool: 'Bash', command, tool_use_id: `b-${command}` })

test('refuses a script that package.json does not declare and lists the ones it does', async ($, on) => {
  project(on, PACKAGE)

  for (const command of ['npm run lint', 'pnpm run lint --fix', 'npm run-script e2e', 'npm install && npm run typecheck']) {
    const answer = await bash($, command)
    expect(answer.deny, command).toContain('script-guard: package.json has no "')
    expect(answer.deny, command).toContain('Available: dev, build, test, build:prod.')
  }
})

test('lets declared scripts, other commands and relocated lookups through', async ($, on) => {
  project(on, PACKAGE)

  for (const command of [
    'npm run dev',
    'npm run build:prod -- --watch',
    'npm test',
    'pnpm run test',
    'npm run lint --if-present',
    'npm run lint -w web',
    'pnpm run lint --filter web',
    'cd web && npm run lint',
    'yarn lint',
    'npm install',
    'git status',
  ]) {
    expect((await bash($, command)).deny, command).toBeUndefined()
  }
})

test('refuses npm test when there is no test script', async ($, on) => {
  project(on, JSON.stringify({ scripts: { dev: 'vite' } }))

  const answer = await $.tool.call({ tool: 'PowerShell', command: 'npm test', tool_use_id: 'p1' })
  expect(answer.deny).toContain('has no "test" script. Available: dev.')
})

test('stays silent without a package.json', async ($, on) => {
  project(on, undefined)

  expect((await bash($, 'npm run lint')).deny).toBeUndefined()
})

test('speaks the language set in the hub', async ($, on) => {
  project(on, PACKAGE)
  // Stands in for the hub: answers the language it would hold.
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  const answer = await bash($, 'npm run lint')
  expect(answer.deny).toContain('script-guard: o package.json não tem o script "lint". Disponíveis: dev, build, test, build:prod.')
})
