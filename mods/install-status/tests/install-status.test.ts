import { expect, mock, test } from 'claude-code/testing'

const START = { cwd: '/repo', surface: null, isInteractive: true } as const

declare const setTimeout: (run: () => void, ms: number) => unknown

// The status line is written unawaited by the mod: give it a moment to land.
const flush = () => new Promise(resolve => setTimeout(() => resolve(undefined), 30))

type Project = { files: Record<string, string>; mtimes: Record<string, number> }

const MANIFEST = JSON.stringify({ dependencies: { react: '^18.0.0' } })

// The world beneath the mod: files and their ages by path, the hub, and the status line recorded.
const world = (on: any, project: Project, off: string[] = [], lang = 'en') => {
  const clock = mock.clock(on)
  const status: (string | undefined)[] = []
  const key = (path: string) => path.replaceAll('\\', '/').replace(/^.*\/repo\//, '')

  on('session.start', (_: unknown, e: any) => ({ cwd: e.cwd }))
  on('session.root', () => ({ value: '/repo' }))
  on('fs.read', (_: unknown, e: { path: string }) => ({ value: project.files[key(e.path)] as never }))
  on('fs.exists', (_: unknown, e: { path: string }) => ({ value: key(e.path) in project.files }))
  on('fs.stat', (_: unknown, e: { path: string }) => {
    const mtimeMs = project.mtimes[key(e.path)]

    if (mtimeMs === undefined) {
      throw new Error('ENOENT')
    }

    return { value: { kind: 'file' as const, size: 1, mtimeMs, isLink: false } }
  })
  on('state.get', { plugin: 'cockpit', key: 'off' }, () => ({ value: { value: off, version: 1 } }))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: lang, version: 1 } }))
  on('ui.status', (_: unknown, e: { text: string | undefined }) => {
    status.push(e.text)

    return { value: undefined }
  })

  return Object.assign(status, { clock })
}

const started = async ($: any) => {
  await $.session.start(START)
  await flush()
}

const NOW = 1_000_000

test('warns when node_modules is missing', async ($, on) => {
  const status = world(on, { files: { 'package.json': MANIFEST }, mtimes: { 'package.json': NOW } })

  await started($)
  expect(status.at(-1)).toBe('install ✗ node_modules missing')
})

test('warns when the lockfile is newer than the last install', async ($, on) => {
  const status = world(on, {
    files: { 'package.json': MANIFEST },
    mtimes: { 'package.json': NOW, 'package-lock.json': NOW + 60000, node_modules: NOW, 'node_modules/.package-lock.json': NOW + 1000 },
  })

  await started($)
  expect(status.at(-1)).toBe('install ✗ lockfile newer')
})

test('shows nothing while the install is current', async ($, on) => {
  const status = world(on, {
    files: { 'package.json': MANIFEST },
    mtimes: { 'package.json': NOW, 'pnpm-lock.yaml': NOW, node_modules: NOW + 5000, 'node_modules/.modules.yaml': NOW + 5000 },
  })

  await started($)
  expect(status).toEqual([])
})

test('shows nothing for a project without dependencies or without package.json', async ($, on) => {
  const status = world(on, { files: { 'package.json': JSON.stringify({ name: 'lib' }) }, mtimes: { 'package.json': NOW } })

  await started($)
  expect(status).toEqual([])
})

test('shows nothing for a Plug and Play project', async ($, on) => {
  const status = world(on, { files: { 'package.json': MANIFEST, '.pnp.cjs': '' }, mtimes: { 'package.json': NOW } })

  await started($)
  expect(status).toEqual([])
})

test('sends the line once, not on every refresh', async ($, on) => {
  const status = world(on, { files: { 'package.json': MANIFEST }, mtimes: { 'package.json': NOW } })
  const { clock } = status

  await started($)
  await clock.advance(120000)
  await flush()
  await clock.advance(120000)
  await flush()
  expect(status).toEqual(['install ✗ node_modules missing'])
})

test('shows nothing while the hub lists it as off', async ($, on) => {
  const status = world(on, { files: { 'package.json': MANIFEST }, mtimes: { 'package.json': NOW } }, ['install-status'])

  await started($)
  expect(status.every(text => text === undefined)).toBe(true)
})

test('speaks the language set in the hub', async ($, on) => {
  const status = world(on, { files: { 'package.json': MANIFEST }, mtimes: { 'package.json': NOW } }, [], 'pt')

  await started($)
  expect(status.at(-1)).toBe('instalação ✗ node_modules ausente')
})
