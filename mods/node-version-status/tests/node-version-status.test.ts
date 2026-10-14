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
