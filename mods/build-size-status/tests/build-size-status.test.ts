import { expect, mock, test } from 'claude-code/testing'

const START = { cwd: '/repo', surface: null, isInteractive: true } as const

declare const setTimeout: (run: () => void, ms: number) => unknown

// The status line is written unawaited by the mod: give it a moment to land.
const flush = () => new Promise(resolve => setTimeout(() => resolve(undefined), 30))

const KB = 1024
const MB = KB * KB

type Entry = { name: string; kind: 'file' | 'dir'; size: number; mtimeMs: number; isLink: boolean }

const file = (name: string, size: number): Entry => ({ name, kind: 'file', size, mtimeMs: 1, isLink: false })
const dir = (name: string): Entry => ({ name, kind: 'dir', size: 0, mtimeMs: 0, isLink: false })

// The tree under the project: folder (relative path) -> entries.
const world = (on: any, tree: Record<string, Entry[]>, off: string[] = [], lang = 'en') => {
  const clock = mock.clock(on)
  const status: (string | undefined)[] = []
  const key = (path: string) => path.replaceAll('\\', '/').replace(/^.*\/repo\/?/, '')

  on('session.start', (_: unknown, e: any) => ({ cwd: e.cwd }))
  on('session.root', () => ({ value: '/repo' }))
  on('fs.exists', (_: unknown, e: { path: string }) => ({ value: key(e.path) in tree }))
  on('fs.list', (_: unknown, e: { path: string }) => ({ value: tree[key(e.path)] ?? [] }))
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

const TREE = { dist: [file('index.js', 1.5 * MB), dir('assets'), dir('cache')], 'dist/assets': [file('app.css', 0.9 * MB)], 'dist/cache': [file('x', 50 * MB)] }

test('shows the size of the build output, skipping caches', async ($, on) => {
  const status = world(on, TREE)

  await started($)
  expect(status.at(-1)).toBe('dist 2.4 MB')
})

test('shows how much the output grew since the first reading of the session', async ($, on) => {
  const tree = { ...TREE }
  const status = world(on, tree)

  await started($)
  tree['dist/assets'] = [file('app.css', 0.9 * MB), file('chunk.js', 120 * KB)]
  await status.clock.advance(300000)
  await flush()
  expect(status.at(-1)).toBe('dist 2.5 MB · +120 KB')
})

test('tries build, out and .next when there is no dist', async ($, on) => {
  const status = world(on, { build: [file('main.js', 300 * KB)] })

  await started($)
  expect(status.at(-1)).toBe('build 300 KB')
})

test('shows nothing without an output folder or with an empty one', async ($, on) => {
  const status = world(on, { dist: [] })

  await started($)
  expect(status).toEqual([])
})

test('shows nothing while the hub lists it as off', async ($, on) => {
  const status = world(on, TREE, ['build-size-status'])

  await started($)
  expect(status.every(text => text === undefined)).toBe(true)
})

test('speaks the language set in the hub', async ($, on) => {
  const status = world(on, TREE, [], 'pt')

  await started($)
  expect(status.at(-1)).toBe('dist 2,4 MB')
})
