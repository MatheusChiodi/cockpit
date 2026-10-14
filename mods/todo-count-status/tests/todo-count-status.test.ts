import { expect, test } from 'claude-code/testing'

const START = { cwd: '/repo', surface: null, isInteractive: true } as const
const TURN = { answer: '', durationMs: 1, isAborted: false, turnId: 't-1', reason: 'answer' } as const

const done = (exitCode: number, stdout = '') => ({
  value: { exitCode, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false },
})

// The world beneath the mod: a fake `git grep -o` (one tag per line), the hub, and the status line recorded.
const world = (on: any, grep: { exitCode: number; tags: string[]; argv: string[] }, off: string[] = []) => {
  const status: (string | undefined)[] = []
  on('session.start', (_: unknown, e: any) => ({ cwd: e.cwd }))
  on('turn.complete', (_: unknown, e: any) => ({ text: e.answer }))
  on('process.run', (_: unknown, e: { argv: string[] }) => {
    grep.argv = [...e.argv]

    return done(grep.exitCode, grep.tags.map(tag => `${tag}\n`).join(''))
  })
  on('state.get', { plugin: 'cockpit', key: 'off' }, () => ({ value: { value: off, version: 1 } }))
  on('ui.status', (_: unknown, e: { text: string | undefined }) => {
    status.push(e.text)

    return { value: undefined }
  })

  return status
}

declare const setTimeout: (run: (value?: unknown) => void, ms: number) => unknown

// The refresh runs unawaited: let it land.
const settle = () => new Promise(resolve => setTimeout(resolve, 30))

test('counts TODO, FIXME and HACK in the tracked files', async ($, on) => {
  const grep = { exitCode: 0, tags: ['TODO', 'TODO', 'TODO', 'FIXME', 'HACK', 'HACK'], argv: [] as string[] }
  const status = world(on, grep)

  await $.session.start(START)
  await settle()
  expect(status.at(-1)).toBe('todo 3 · fixme 1 · hack 2')
  expect(grep.argv.slice(0, 2)).toEqual(['git', 'grep'])
})

test('leaves out a tag with no hits, and recounts after a turn', async ($, on) => {
  const grep = { exitCode: 0, tags: ['FIXME'], argv: [] as string[] }
  const status = world(on, grep)

  await $.session.start(START)
  await settle()
  expect(status.at(-1)).toBe('fixme 1')

  grep.tags = ['TODO', 'TODO']
  await $.turn.complete(TURN)
  await settle()
  expect(status.at(-1)).toBe('todo 2')
})

test('shows nothing when no tag is found, and outside a repository', async ($, on) => {
  const grep = { exitCode: 1, tags: [] as string[], argv: [] as string[] }
  const status = world(on, grep)

  await $.session.start(START)
  await settle()
  expect(status.at(-1)).toBeUndefined()

  grep.exitCode = 128
  await $.turn.complete(TURN)
  await settle()
  expect(status.at(-1)).toBeUndefined()
})

test('shows nothing while the hub lists it as off', async ($, on) => {
  const status = world(on, { exitCode: 0, tags: ['TODO'], argv: [] }, ['todo-count-status'])

  await $.session.start(START)
  await settle()
  expect(status.length).toBeGreaterThan(0)
  expect(status.every(text => text === undefined)).toBe(true)
})
