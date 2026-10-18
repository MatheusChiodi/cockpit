import { expect, test } from 'claude-code/testing'

const run = (args: string) => ({
  command: 'open',
  args,
  origin: { kind: 'composer' } as const,
  presentation: { isFullscreen: true, columns: 120 },
})

const done = (exitCode: number, stdout = '') => ({
  value: { exitCode, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false },
})

// A project at `root` on the given OS; every spawn is recorded in `spawned`.
const project = (on: any, root: string, os: string | undefined, spawned: string[][], kernel = 'Linux') => {
  on('session.root', () => ({ value: root }))
  on('env.get', () => ({ value: os }))
  on('fs.exists', (_: unknown, e: { path: string }) => ({ value: !e.path.endsWith('missing.txt') }))
  on('process.run', (_: unknown, e: { argv: string[] }) => {
    if (e.argv[0] === 'uname') return done(0, `${kernel}\n`)
    spawned.push([...e.argv])

    return done(os === 'Windows_NT' ? 1 : 0)
  })
}

test('opens a file of the project with xdg-open on Linux', async ($, on) => {
  const spawned: string[][] = []
  project(on, '/work', undefined, spawned)

  expect((await $.command.run(run('docs/report.pdf'))).text).toBe('Opened docs/report.pdf')
  expect(spawned).toEqual([['xdg-open', '/work/docs/report.pdf']])
})

test('uses open on macOS', async ($, on) => {
  const spawned: string[][] = []
  project(on, '/work', undefined, spawned, 'Darwin')

  await $.command.run(run('docs'))
  expect(spawned[0]?.[0]).toBe('open')
})

test('uses explorer with backslashes on Windows, whatever its exit code', async ($, on) => {
  const spawned: string[][] = []
  project(on, 'D:\\work', 'Windows_NT', spawned)

  expect((await $.command.run(run('src/app'))).text).toBe('Opened src/app')
  expect(spawned).toEqual([['explorer', 'D:\\work\\src\\app']])
})

test('refuses a path that lands outside the project', async ($, on) => {
  const spawned: string[][] = []
  project(on, '/work', undefined, spawned)

  for (const typed of ['../secrets', 'docs/../../etc', '/etc/passwd', '/workshop/x']) {
    expect((await $.command.run(run(typed))).text, typed).toBe(`Outside the project: ${typed}`)
  }

  expect(spawned).toEqual([])
})

test('accepts an absolute path inside the project and says when it is missing', async ($, on) => {
  const spawned: string[][] = []
  project(on, '/work', undefined, spawned)

  expect((await $.command.run(run('/work/a.txt'))).text).toBe('Opened a.txt')
  expect((await $.command.run(run('missing.txt'))).text).toBe('Not found: missing.txt')
  expect((await $.command.run(run(''))).text).toBe('Usage: /open <path>')
})

test('speaks the language set in the hub', async ($, on) => {
  project(on, '/work', undefined, [])
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  expect((await $.command.run(run('../x'))).text).toBe('Fora do projeto: ../x')
})

test('says when the opener fails on Linux', async ($, on) => {
  on('session.root', () => ({ value: '/work' }))
  on('env.get', () => ({ value: undefined }))
  on('fs.exists', () => ({ value: true }))
  on('process.run', (_: unknown, e: { argv: readonly string[] }) => (e.argv[0] === 'uname' ? done(0, 'Linux\n') : done(4)))

  expect((await $.command.run(run('a.txt'))).text).toBe('Could not start the system opener.')
})

test('says when the opener cannot start at all', async ($, on) => {
  on('session.root', () => ({ value: 'D:\\work' }))
  on('env.get', () => ({ value: 'Windows_NT' }))
  on('fs.exists', () => ({ value: true }))
  on('process.run', () => {
    throw new Error('ENOENT')
  })

  expect((await $.command.run(run('a.txt'))).text).toBe('Could not start the system opener.')
})

test('strips quotes and opens the project root itself', async ($, on) => {
  const spawned: string[][] = []
  project(on, '/work', undefined, spawned)

  expect((await $.command.run(run('  "my docs/plan v2.pdf"  '))).text).toBe('Opened my docs/plan v2.pdf')
  expect((await $.command.run(run('.'))).text).toBe('Opened .')
  expect(spawned).toEqual([
    ['xdg-open', '/work/my docs/plan v2.pdf'],
    ['xdg-open', '/work'],
  ])
})

test('compares Windows paths without case', async ($, on) => {
  const spawned: string[][] = []
  project(on, 'D:\\Work', 'Windows_NT', spawned)

  expect((await $.command.run(run('d:\\work\\README.md'))).text).toBe('Opened README.md')
  expect((await $.command.run(run('C:\\Windows'))).text).toBe('Outside the project: C:\\Windows')
  expect(spawned).toEqual([['explorer', 'd:\\work\\README.md']])
})

test('speaks Spanish when the hub is set to es', async ($, on) => {
  project(on, '/work', undefined, [])
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  expect((await $.command.run(run(''))).text).toBe('Uso: /open <ruta>')
  expect((await $.command.run(run('missing.txt'))).text).toBe('No encontrado: missing.txt')
  expect((await $.command.run(run('a.txt'))).text).toBe('Abrió a.txt')
})
