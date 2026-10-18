import { expect, mock, test } from 'claude-code/testing'

const START = { cwd: '/work', surface: null, isInteractive: true } as const

declare const setTimeout: (run: (value?: unknown) => void, ms: number) => unknown

// The check runs unawaited at session start: give it a moment to land.
const flush = () => new Promise(resolve => setTimeout(resolve, 60))

const done = (exitCode: number, stdout = '') => ({
  value: { exitCode, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false },
})

type World = { files: string[]; os?: string; outdated: string; exitCode: number; argv: string[] }

const OUTDATED = JSON.stringify({
  react: { current: '18.2.0', latest: '19.0.0' },
  vite: { current: '5.1.0', latest: '5.4.2' },
  zod: { current: '3.22.0', latest: '3.23.8' },
})

const fake = (overrides: Partial<World> = {}): World => ({
  files: ['package.json', 'node_modules'],
  outdated: OUTDATED,
  // npm outdated exits 1 when something is outdated.
  exitCode: 1,
  argv: [],
  ...overrides,
})

// The world beneath the mod: the project's files, a fake `npm outdated`, the hub, and the status line recorded.
const world = (on: any, held: World, off: string[] = [], lang = 'en') => {
  mock.clock(on)
  const status: (string | undefined)[] = []
  on('session.start', (_: unknown, e: any) => ({ cwd: e.cwd }))
  on('session.root', () => ({ value: '/work' }))
  on('fs.exists', (_: unknown, e: { path: string }) => ({
    // The engine resolves paths against the host: match on the file name.
    value: held.files.includes(e.path.replaceAll('\\', '/').split('/').pop() ?? ''),
  }))
  on('env.get', () => ({ value: held.os }))
  on('process.run', (_: unknown, e: { argv: string[] }) => {
    held.argv = [...e.argv]

    return done(held.exitCode, held.outdated)
  })
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

test('counts the outdated packages and the major jumps', async ($, on) => {
  const held = fake()
  const status = world(on, held)

  await started($)
  expect(status.at(-1)).toBe('deps 3 behind · 1 major')
  expect(held.argv).toEqual(['npm', 'outdated', '--json'])
})

test('omits the major count when there is none', async ($, on) => {
  const status = world(on, fake({ outdated: JSON.stringify({ vite: { current: '5.1.0', latest: '5.4.2' } }) }))

  await started($)
  expect(status.at(-1)).toBe('deps 1 behind')
})

test('says all is current when npm lists nothing', async ($, on) => {
  const status = world(on, fake({ outdated: '', exitCode: 0 }))

  await started($)
  expect(status.at(-1)).toBe('deps ✓')
})

test('runs npm through cmd on Windows', async ($, on) => {
  const held = fake({ os: 'Windows_NT' })
  world(on, held)

  await started($)
  expect(held.argv).toEqual(['cmd', '/c', 'npm', 'outdated', '--json'])
})

for (const [name, held] of [
  ['without package.json', fake({ files: ['node_modules'] })],
  ['without node_modules', fake({ files: ['package.json'] })],
  ['with unreadable output', fake({ outdated: 'not json' })],
] as const) {
  test(`shows nothing ${name}`, async ($, on) => {
    const status = world(on, held)

    await started($)
    expect(status).toEqual([])
  })
}

test('shows nothing while the hub lists it as off', async ($, on) => {
  const status = world(on, fake(), ['deps-status'])

  await started($)
  expect(status.length).toBeGreaterThan(0)
  expect(status.every(text => text === undefined)).toBe(true)
})

test('speaks the language set in the hub', async ($, on) => {
  const status = world(on, fake(), [], 'pt')

  await started($)
  expect(status.at(-1)).toBe('deps 3 atrás · 1 major')
})

test('speaks Spanish when the hub is set to es', async ($, on) => {
  const status = world(on, fake(), [], 'es')

  await started($)
  expect(status.at(-1)).toBe('deps 3 atrasadas · 1 major')
})

test('shows nothing when npm cannot be started', async ($, on) => {
  const status: (string | undefined)[] = []
  mock.clock(on)
  on('session.start', (_: unknown, e: any) => ({ cwd: e.cwd }))
  on('session.root', () => ({ value: '/work' }))
  on('fs.exists', () => ({ value: true }))
  on('env.get', () => ({ value: undefined }))
  on('process.run', () => {
    throw new Error('spawn npm ENOENT')
  })
  on('ui.status', (_: unknown, e: { text: string | undefined }) => {
    status.push(e.text)

    return { value: undefined }
  })

  await started($)
  expect(status).toEqual([])
})

test('counts a package whose versions it cannot read, without a major jump', async ($, on) => {
  const status = world(on, fake({ outdated: JSON.stringify({ linked: { current: 'linked' }, left: { latest: '2.0.0' } }) }))

  await started($)
  expect(status.at(-1)).toBe('deps 2 behind · 1 major')
})

// Stands in for the hub: a /flip command that writes its own `off` list, as the settings pane does.
const HUB = {
  name: 'cockpit',
  register: (on: any) => {
    on('command.run', { command: 'flip' }, async ($: any) => {
      await $.state.set({ plugin: 'cockpit', key: 'off' }, ['deps-status'])

      return { text: 'flipped' }
    })
  },
}

test('clears the entry when the hub turns it off', { plugins: [HUB] }, async ($, on) => {
  const status: (string | undefined)[] = []
  mock.clock(on)
  on('session.start', (_: unknown, e: any) => ({ cwd: e.cwd }))
  on('session.root', () => ({ value: '/work' }))
  on('fs.exists', () => ({ value: true }))
  on('env.get', () => ({ value: undefined }))
  on('process.run', () => done(1, OUTDATED))
  on('ui.status', (_: unknown, e: { text: string | undefined }) => {
    status.push(e.text)

    return { value: undefined }
  })

  await started($)
  expect(status.at(-1)).toBe('deps 3 behind · 1 major')

  await $.command.run({ command: 'flip', args: '', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 80 } })
  expect(status.at(-1)).toBeUndefined()
})
