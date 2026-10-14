import { expect, mock, test } from 'claude-code/testing'

const START = { cwd: '/repo', surface: null, isInteractive: true } as const

declare const setTimeout: (run: () => void, ms: number) => unknown

// The status line is written unawaited by the mod: give it a moment to land.
const flush = () => new Promise(resolve => setTimeout(() => resolve(undefined), 30))

const done = (exitCode: number, stdout = '') => ({
  value: { exitCode, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false },
})

type Machine = { files: Record<string, string>; listening: number[]; tool?: 'netstat' | 'ss' | 'none' }

const world = (on: any, machine: Machine, off: string[] = [], lang = 'en') => {
  mock.clock(on)
  const status: (string | undefined)[] = []
  const key = (path: string) => path.replaceAll('\\', '/').replace(/^.*\/repo\//, '')
  const tool = machine.tool ?? 'netstat'

  on('session.start', (_: unknown, e: any) => ({ cwd: e.cwd }))
  on('session.root', () => ({ value: '/repo' }))
  on('fs.read', (_: unknown, e: { path: string }) => ({ value: machine.files[key(e.path)] as never }))
  on('process.run', (_: unknown, e: { argv: string[] }) => {
    if (e.argv[0] !== tool) {
      return done(127)
    }

    const sockets = machine.listening.map(port =>
      tool === 'netstat' ? `  TCP    0.0.0.0:${port}    0.0.0.0:0    LISTENING    4` : `LISTEN 0 511 127.0.0.1:${port} 0.0.0.0:*`,
    )

    return done(0, ['  TCP    10.0.0.2:51234    1.1.1.1:443    ESTABLISHED    9', ...sockets].join('\n'))
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

const ENV = 'DATABASE_URL=postgresql://app:s3cret@localhost:5432/app\nREDIS_URL=redis://127.0.0.1\nAPI=https://api.example.com\n'

test('warns about the local databases that are not listening, with no secret in the line', async ($, on) => {
  const status = world(on, { files: { '.env': ENV }, listening: [3000] })

  await started($)
  expect(status.at(-1)).toBe('db ✗ postgres:5432 redis:6379 down')
  expect(status.join()).not.toContain('s3cret')
})

test('names only the ones that are down', async ($, on) => {
  const status = world(on, { files: { '.env': ENV }, listening: [5432] })

  await started($)
  expect(status.at(-1)).toBe('db ✗ redis:6379 down')
})

test('shows nothing when every port listens, and reads ss where netstat is missing', async ($, on) => {
  const status = world(on, { files: { '.env.example': ENV }, listening: [5432, 6379], tool: 'ss' })

  await started($)
  expect(status).toEqual([])
})

test('shows nothing for a remote database', async ($, on) => {
  const remote = world(on, {
    files: { '.env': 'DATABASE_URL=postgres://u:p@db.prod.example.com:5432/app\n' },
    listening: [],
  })

  await started($)
  expect(remote).toEqual([])
})

test('shows nothing when neither netstat nor ss runs', async ($, on) => {
  const status = world(on, { files: { '.env': ENV }, listening: [], tool: 'none' })

  await started($)
  expect(status).toEqual([])
})

test('shows nothing while the hub lists it as off', async ($, on) => {
  const status = world(on, { files: { '.env': ENV }, listening: [] }, ['db-port-status'])

  await started($)
  expect(status.every(text => text === undefined)).toBe(true)
})

test('speaks the language set in the hub', async ($, on) => {
  const status = world(on, { files: { '.env': ENV }, listening: [6379] }, [], 'pt')

  await started($)
  expect(status.at(-1)).toBe('db ✗ postgres:5432 fora do ar')
})
