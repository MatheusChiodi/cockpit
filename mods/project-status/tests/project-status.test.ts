import { expect, test } from 'claude-code/testing'

const START = { cwd: '/home/me/shop', surface: null, isInteractive: true } as const

declare const setTimeout: (run: (value?: unknown) => void, ms: number) => unknown

// The status line is written unawaited by the mod: give it a moment to land.
const flush = () => new Promise(resolve => setTimeout(resolve, 30))

const done = (exitCode: number, stdout = '') => ({
  value: { exitCode, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false },
})

type Project = { files: Record<string, string>; node: string | null }

// The world beneath the mod: the project's files by name, a fake `node --version`, the hub, and the status line recorded.
const world = (on: any, project: Project, off: string[] = []) => {
  const status: (string | undefined)[] = []
  const fileOf = (path: string) => path.replaceAll('\\', '/').split('/').pop() ?? ''

  on('session.start', (_: unknown, e: any) => ({ cwd: e.cwd }))
  on('session.root', () => ({ value: '/home/me/shop' }))
  on('fs.exists', (_: unknown, e: { path: string }) => ({ value: fileOf(e.path) in project.files }))
  on('fs.read', (_: unknown, e: { path: string }) => ({ value: project.files[fileOf(e.path)] as never }))
  on('process.run', () => (project.node === null ? done(127) : done(0, `${project.node}\n`)))
  on('state.get', { plugin: 'cockpit', key: 'off' }, () => ({ value: { value: off, version: 1 } }))
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

const MANIFEST = JSON.stringify({ name: 'shop-app', version: '1.2.3' })

test('shows name, version, Node version and package manager', async ($, on) => {
  const status = world(on, { files: { 'package.json': MANIFEST, 'pnpm-lock.yaml': '' }, node: 'v20.11.1' })

  await started($)
  expect(status.at(-1)).toBe('shop-app@1.2.3 · node 20.11.1 · pnpm')
})

for (const [lockfile, manager] of [
  ['yarn.lock', 'yarn'],
  ['bun.lockb', 'bun'],
  ['bun.lock', 'bun'],
  ['package-lock.json', 'npm'],
] as const) {
  test(`picks ${manager} by ${lockfile}`, async ($, on) => {
    const status = world(on, { files: { 'package.json': MANIFEST, [lockfile]: '' }, node: 'v20.0.0' })

    await started($)
    expect(status.at(-1)).toBe(`shop-app@1.2.3 · node 20.0.0 · ${manager}`)
  })
}

test('shows no manager without a lockfile', async ($, on) => {
  const status = world(on, { files: { 'package.json': MANIFEST }, node: 'v20.0.0' })

  await started($)
  expect(status.at(-1)).toBe('shop-app@1.2.3 · node 20.0.0')
})

test('falls back to the folder name without a package.json', async ($, on) => {
  const status = world(on, { files: {}, node: 'v20.0.0' })

  await started($)
  expect(status.at(-1)).toBe('shop')
})

test('falls back to the folder name with an invalid package.json', async ($, on) => {
  const status = world(on, { files: { 'package.json': '{ nope' }, node: 'v20.0.0' })

  await started($)
  expect(status.at(-1)).toBe('shop · node 20.0.0')
})

test('leaves the version out of a package with none, and Node out when it is missing', async ($, on) => {
  const status = world(on, { files: { 'package.json': JSON.stringify({ name: 'lib' }) }, node: null })

  await started($)
  expect(status.at(-1)).toBe('lib')
})

test('shows nothing while the hub lists it as off', async ($, on) => {
  const status = world(on, { files: { 'package.json': MANIFEST }, node: 'v20.0.0' }, ['project-status'])

  await started($)
  expect(status.length).toBeGreaterThan(0)
  expect(status.every(text => text === undefined)).toBe(true)
})
