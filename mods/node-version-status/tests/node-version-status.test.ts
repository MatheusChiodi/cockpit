import { expect, test } from 'claude-code/testing'

const START = { cwd: '/repo', surface: null, isInteractive: true } as const

const fileOf = (path: string) => path.replaceAll('\\', '/').split('/').pop() ?? ''

const ran = (stdout: string) => ({
  value: { exitCode: 0, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false },
})

// A project with `files`, running `node` at the given version; returns what the status line shows.
const world = (on: any, files: Record<string, string>, node = 'v18.19.0\n') => {
  const status: (string | undefined)[] = []

  on('session.start', (_: unknown, e: any) => ({ cwd: e.cwd }))
  on('session.root', () => ({ value: '/work' }))
  on('fs.read', (_: unknown, e: { path: string }) =>
    fileOf(e.path) in files ? { value: files[fileOf(e.path)] } : { deny: 'ENOENT' },
  )
  on('process.run', () => ran(node))
  on('ui.status', (_: unknown, e: { text: string | undefined }) => {
    status.push(e.text)

    return { value: undefined }
  })

  return status
}

const PACKAGE = (range: string) => JSON.stringify({ engines: { node: range } })

test('shows the entry when the running Node is outside engines.node', async ($, on) => {
  const status = world(on, { 'package.json': PACKAGE('>=20') })

  await $.session.start(START)
  expect(status).toEqual(['node 18.19.0 ✗ wants >=20'])
})

test('stays silent when the running Node satisfies the range', async ($, on) => {
  const ranges = ['>=18', '^18.17.0', '18.x', '>=16 <20', '16 || 18', '14 - 18', '~18.19']

  const files: Record<string, string> = {}
  const status = world(on, files)

  for (const range of ranges) {
    files['package.json'] = PACKAGE(range)
    await $.session.start(START)
    expect(status, range).toEqual([])
  }

  // Each start really ran the check: a range the version misses is shown.
  files['package.json'] = PACKAGE('^20 || ^22')
  await $.session.start(START)
  expect(status).toEqual(['node 18.19.0 ✗ wants ^20 || ^22'])
})

test('reads .nvmrc, .node-version and .tool-versions when engines is absent', async ($, on) => {
  const status = world(on, { 'package.json': '{}', '.nvmrc': 'v20.11.0\n' })

  await $.session.start(START)
  expect(status).toEqual(['node 18.19.0 ✗ wants 20.11.0'])
})

test('ignores version aliases and projects that ask for nothing', async ($, on) => {
  const alias = world(on, { '.nvmrc': 'lts/*\n' })
  await $.session.start(START)
  expect(alias).toEqual([])
})

test('ignores a project with no version files', async ($, on) => {
  const none = world(on, { 'README.md': '' })
  await $.session.start(START)
  expect(none).toEqual([])
})

test('speaks the language set in the hub', async ($, on) => {
  const status = world(on, { '.tool-versions': 'nodejs 22.1.0\n' })
  // Stands in for the hub: answers the language it would hold.
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  await $.session.start(START)
  expect(status).toEqual(['node 18.19.0 ✗ pede 22.1.0'])
})

test('speaks Spanish when the hub is set to es', async ($, on) => {
  const status = world(on, { '.node-version': '20\n' })
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  await $.session.start(START)
  expect(status).toEqual(['node 18.19.0 ✗ pide 20'])
})

test('judges strict comparators by major', async ($, on) => {
  const files: Record<string, string> = {}
  const status = world(on, files)

  for (const [range, shown] of [
    ['>18', true],
    ['<18', true],
    ['<=18', false],
    ['>17', false],
    ['=18', false],
    ['20.x', true],
  ] as const) {
    status.length = 0
    files['package.json'] = PACKAGE(range)
    await $.session.start(START)
    expect(status.length > 0, range).toBe(shown)
  }
})

test('falls through an invalid package.json or an empty engines.node to the version files', async ($, on) => {
  const files: Record<string, string> = { 'package.json': '{ broken', '.nvmrc': '22\n' }
  const status = world(on, files)

  await $.session.start(START)
  expect(status).toEqual(['node 18.19.0 ✗ wants 22'])

  status.length = 0
  files['package.json'] = PACKAGE('  ')
  await $.session.start(START)
  expect(status).toEqual(['node 18.19.0 ✗ wants 22'])
})

test('engines.node wins over the version files', async ($, on) => {
  const status = world(on, { 'package.json': PACKAGE('>=18'), '.nvmrc': '22\n' })

  await $.session.start(START)
  expect(status).toEqual([])
})

test('stays silent when node cannot be run', async ($, on) => {
  const status: (string | undefined)[] = []
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.root', () => ({ value: '/work' }))
  on('fs.read', (_, e) => (fileOf(e.path) === 'package.json' ? { value: PACKAGE('>=22') } : { deny: 'ENOENT' }))
  on('process.run', () => ({ value: { exitCode: 127, stdout: '', stderr: 'node: not found', isStdoutTruncated: false, isStderrTruncated: false } }))
  on('ui.status', (_, e) => {
    status.push(e.text)

    return { value: undefined }
  })

  await $.session.start(START)
  expect(status).toEqual([])
})

test('reads a v prefix in .tool-versions', async ($, on) => {
  const status = world(on, { '.tool-versions': 'python 3.12.0\nnodejs v20.5.1\n' }, 'v20.5.1\n')

  await $.session.start(START)
  expect(status).toEqual([])
})
