import { expect, test } from 'claude-code/testing'

const run = {
  command: 'pm',
  args: '',
  origin: { kind: 'composer' } as const,
  presentation: { isFullscreen: true, columns: 120 },
}

const fileOf = (path: string) => path.replaceAll('\\', '/').split('/').pop() ?? ''

// A project at /work with a package.json (`manifest`, none when null) and the lockfiles named in `locks`.
const project = (on: any, locks: string[], manifest: string | null = '{}') => {
  on('session.root', () => ({ value: '/work' }))
  on('fs.read', (_: unknown, e: { path: string }) =>
    manifest !== null && fileOf(e.path) === 'package.json' ? { value: manifest } : { deny: 'ENOENT' },
  )
  on('fs.exists', (_: unknown, e: { path: string }) => ({ value: locks.includes(fileOf(e.path)) }))
}

test('names the manager of the lockfile and its commands', async ($, on) => {
  project(on, ['pnpm-lock.yaml'])

  const lines = ((await $.command.run(run)).text ?? '').split('\n')
  expect(lines[0]).toBe('pnpm (pnpm-lock.yaml)')
  expect(lines).toContain('install  pnpm install')
  expect(lines).toContain('add      pnpm add <package>')
  expect(lines).toContain('remove   pnpm remove <package>')
  expect(lines).toContain('run      pnpm run <script>')
  expect(lines).toContain('exec     pnpm exec <bin>')
  expect(lines).toContain('one-off  pnpm dlx <package>')
})

test('the packageManager field wins over the lockfile', async ($, on) => {
  project(on, ['package-lock.json'], JSON.stringify({ packageManager: 'bun@1.1.0' }))

  const lines = ((await $.command.run(run)).text ?? '').split('\n')
  expect(lines[0]).toBe('bun (package.json packageManager)')
  expect(lines).toContain('one-off  bunx <package>')
})

test('says so when there is no lockfile and warns about several', async ($, on) => {
  project(on, [])
  expect(((await $.command.run(run)).text ?? '').split('\n')[0]).toContain('npm (no lockfile')
})

test('warns when several lockfiles disagree', async ($, on) => {
  project(on, ['yarn.lock', 'package-lock.json'])

  const lines = ((await $.command.run(run)).text ?? '').split('\n')
  expect(lines[0]).toBe('pm: several lockfiles (yarn.lock, package-lock.json). Keep one, or set packageManager in package.json.')
  expect(lines[1]).toBe('npm')
})

test('says so outside a package', async ($, on) => {
  project(on, [], null)
  expect((await $.command.run(run)).text).toBe('pm: no package.json in this folder.')
})

test('speaks the language set in the hub', async ($, on) => {
  project(on, ['yarn.lock'])
  // Stands in for the hub: answers the language it would hold.
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  const lines = ((await $.command.run(run)).text ?? '').split('\n')
  expect(lines[0]).toBe('yarn (yarn.lock)')
  expect(lines).toContain('adicionar  yarn add <package>')
})
