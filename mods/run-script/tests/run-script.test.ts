import { expect, test } from 'claude-code/testing'

const run = (args: string) => ({
  command: 'run',
  args,
  origin: { kind: 'composer' } as const,
  presentation: { isFullscreen: true, columns: 120 },
})

const PACKAGE = JSON.stringify({ scripts: { test: 'vitest', build: 'tsc' } })

// The engine resolves paths against the host (D:\work\x on Windows): compare them as slashes.
const at = (path: string, file: string) => path.replaceAll('\\', '/').endsWith(`/work/${file}`)

// A project at /work with a package.json and the lockfiles named in `locks`.
const project = (on: any, locks: string[] = [], os = 'Linux') => {
  on('session.root', () => ({ value: '/work' }))
  on('env.get', () => ({ value: os }))
  on('fs.read', (_: unknown, e: { path: string }) =>
    at(e.path, 'package.json') ? { value: PACKAGE } : { deny: 'ENOENT' },
  )
  on('fs.exists', (_: unknown, e: { path: string }) => ({ value: locks.some(lock => at(e.path, lock)) }))
}

const done = (exitCode: number, stdout = '', stderr = '') => ({
  value: { exitCode, stdout, stderr, isStdoutTruncated: false, isStderrTruncated: false },
})

test('lists the scripts when no name is given', async ($, on) => {
  project(on)

  expect((await $.command.run(run(''))).text).toBe('test\nbuild')
})

test('runs the script with the package manager of the lockfile and keeps the last 30 lines', async ($, on) => {
  project(on, ['pnpm-lock.yaml'])
  let argv: readonly string[] = []
  on('process.run', (_, e) => {
    argv = e.argv

    return done(1, Array.from({ length: 50 }, (_, i) => `line ${i + 1}`).join('\n'), 'boom')
  })

  const answer = await $.command.run(run('test'))
  const lines = (answer.text ?? '').split('\n')
  expect(argv).toEqual(['pnpm', 'run', 'test'])
  expect(lines[0]).toBe('$ pnpm run test')
  expect(lines.at(-1)).toBe('exit 1')
  expect(lines).toContain('boom')
  expect(lines).not.toContain('line 20')
  expect(lines.length).toBe(32)
})

test('wraps the package manager in cmd on Windows', async ($, on) => {
  project(on, [], 'Windows_NT')
  let argv: readonly string[] = []
  on('process.run', (_, e) => {
    argv = e.argv

    return done(0, 'ok')
  })

  await $.command.run(run('build'))
  expect(argv).toEqual(['cmd', '/c', 'npm', 'run', 'build'])
})

test('refuses a name that package.json does not declare', async ($, on) => {
  project(on)
  let ran = 0
  on('process.run', () => {
    ran += 1

    return done(0)
  })

  const answer = await $.command.run(run('--help'))
  expect(answer.text).toContain('No script "--help". Available: test, build')
  expect(ran).toBe(0)
})

test('speaks the language set in the hub', async ($, on) => {
  project(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  expect((await $.command.run(run('nope'))).text).toContain('inexistente')
})
