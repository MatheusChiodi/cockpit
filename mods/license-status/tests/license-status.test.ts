import { expect, mock, test } from 'claude-code/testing'

const START = { cwd: '/repo', surface: null, isInteractive: true } as const

declare const setTimeout: (run: () => void, ms: number) => unknown

// The status line is written unawaited by the mod: give it a moment to land.
const flush = () => new Promise(resolve => setTimeout(() => resolve(undefined), 30))

// The world beneath the mod: the project's files by name, the hub, and the status line recorded.
const world = (on: any, files: Record<string, string>, off: string[] = [], lang = 'en') => {
  mock.clock(on)
  const status: (string | undefined)[] = []
  const key = (path: string) => path.replaceAll('\\', '/').replace(/^.*\/repo\//, '')

  on('session.start', (_: unknown, e: any) => ({ cwd: e.cwd }))
  on('session.root', () => ({ value: '/repo' }))
  on('fs.read', (_: unknown, e: { path: string }) => ({ value: files[key(e.path)] as never }))
  on('fs.list', () => ({
    value: Object.keys(files).map(name => ({ name, kind: 'file' as const, size: 1, mtimeMs: 1, isLink: false })),
  }))
  on('state.get', { plugin: 'cockpit', key: 'off' }, () => ({ value: { value: off, version: 1 } }))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: lang, version: 1 } }))
  on('ui.status', (_: unknown, e: { text: string | undefined }) => {
    status.push(e.text)

    return { value: undefined }
  })

  return status
}

const started = async ($: any) => {
  await $.session.start(START)
  await flush()
}

const PUBLIC = JSON.stringify({ name: 'lib', version: '1.0.0' })

test('warns when a package has neither a license field nor a license file', async ($, on) => {
  const status = world(on, { 'package.json': PUBLIC, 'README.md': '' })

  await started($)
  expect(status.at(-1)).toBe('license ✗ none')
})

test('shows nothing with a license field or a license file', async ($, on) => {
  const field = world(on, { 'package.json': JSON.stringify({ license: 'MIT' }) })

  await started($)
  expect(field).toEqual([])
})

test('a LICENSE file is enough', async ($, on) => {
  const status = world(on, { 'package.json': PUBLIC, LICENSE: 'MIT' })

  await started($)
  expect(status).toEqual([])
})

test('a private package needs no license', async ($, on) => {
  const status = world(on, { 'package.json': JSON.stringify({ private: true }) })

  await started($)
  expect(status).toEqual([])
})

test('reads the license of Cargo.toml', async ($, on) => {
  const cargo = world(on, { 'Cargo.toml': '[package]\nname = "x"\nversion = "0.1.0"\n' })

  await started($)
  expect(cargo.at(-1)).toBe('license ✗ none')
})

test('shows nothing in a folder with no manifest', async ($, on) => {
  const status = world(on, { 'README.md': '' })

  await started($)
  expect(status).toEqual([])
})

test('shows nothing while the hub lists it as off', async ($, on) => {
  const status = world(on, { 'package.json': PUBLIC }, ['license-status'])

  await started($)
  expect(status.every(text => text === undefined)).toBe(true)
})

test('speaks the language set in the hub', async ($, on) => {
  const status = world(on, { 'package.json': PUBLIC }, [], 'pt')

  await started($)
  expect(status.at(-1)).toBe('licença ✗ nenhuma')
})
