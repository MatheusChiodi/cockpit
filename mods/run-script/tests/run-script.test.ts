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

// A project at /work whose package.json reads `text` (or is missing when undefined).
const manifest = (on: any, text: string | undefined | (() => string | undefined)) => {
  const read = typeof text === 'function' ? text : () => text
  on('session.root', () => ({ value: '/work' }))
  on('env.get', () => ({ value: 'Linux' }))
  on('fs.read', (_: unknown, e: { path: string }) => {
    const held = read()

    return held !== undefined && at(e.path, 'package.json') ? { value: held } : { deny: 'ENOENT' }
  })
  on('fs.exists', () => ({ value: false }))
}

test('speaks Spanish when the hub is set to es', async ($, on) => {
  project(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))
  on('process.run', () => done(2))

  expect((await $.command.run(run('nope'))).text).toBe('No existe el script "nope". Disponibles: test, build')
  expect((await $.command.run(run('test'))).text).toBe('$ npm run test\n(sin salida)\nsalida 2')
})

test('says so when there is no package.json or it is not JSON', async ($, on) => {
  let text: string | undefined
  manifest(on, () => text)

  expect((await $.command.run(run(''))).text).toBe('No package.json in this project.')
  text = '{ broken'
  expect((await $.command.run(run('test'))).text).toBe('No package.json in this project.')
})

test('says so when package.json declares no scripts', async ($, on) => {
  manifest(on, JSON.stringify({ name: 'app' }))

  expect((await $.command.run(run(''))).text).toBe('package.json has no scripts.')
  expect((await $.command.run(run('test'))).text).toBe('No script "test". Available: ')
})

test('an inherited property name is not a script', async ($, on) => {
  project(on)
  let ran = 0
  on('process.run', () => {
    ran += 1

    return done(0)
  })

  expect((await $.command.run(run('constructor'))).text).toContain('No script "constructor"')
  expect(ran).toBe(0)
})

test('answers with the failure text when the package manager cannot start', async ($, on) => {
  project(on, ['yarn.lock'])
  on('process.run', () => {
    throw new Error('spawn yarn ENOENT')
  })

  expect((await $.command.run(run('build'))).text).toBe('Could not run the package manager.')
})

test('picks bun from its lockfile, and shows the Portuguese exit line', async ($, on) => {
  project(on, ['bun.lock'])
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))
  on('process.run', () => done(0, 'built\n\n'))

  expect((await $.command.run(run('build'))).text).toBe('$ bun run build\nbuilt\nsaída 0')
})
