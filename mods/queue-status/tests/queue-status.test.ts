import { expect, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { On } from 'claude-code'

const TURN = { answer: '', durationMs: 1, isAborted: false, turnId: 't-1', reason: 'answer' } as const

const ORIGIN = { kind: 'composer' } as const

// The world beneath the mod: prompts enter, and the status line is recorded.
const world = (on: On) => {
  const status: (string | undefined)[] = []
  on('turn.start', (_$, e) => ({ turnId: e.turnId }))
  on('turn.complete', (_$, e) => ({ text: e.answer }))
  on('prompt.submit', (_$, e) => ({ text: e.text }))
  on('session.append', (_$, e, next) => next(e))
  on('ui.status', (_$, e) => {
    status.push(e.text)

    return { value: undefined }
  })

  return status
}

const submit = ($: Engine, text: string) => $.prompt.submit({ text, origin: ORIGIN } as never)

test('counts the prompts typed while a turn runs and clears them as they are delivered', async ($, on) => {
  const status = world(on)

  await submit($, 'first')
  await $.turn.start({ text: 'first', turnId: 't-1' })
  await submit($, 'second')
  expect(status.at(-1)).toBe('queue 1 prompt waiting')

  await submit($, 'third')
  expect(status.at(-1)).toBe('queue 2 prompts waiting')

  await $.turn.complete(TURN)
  await $.turn.start({ text: 'second', turnId: 't-2' })
  expect(status.at(-1)).toBe('queue 1 prompt waiting')

  await $.session.append({
    door: 'attachment',
    origin: { kind: 'engine' },
    uuid: 'u1',
    message: { type: 'attachment', name: 'queued_command', content: [] },
  } as never)
  expect(status.at(-1)).toBeUndefined()
})

test('a prompt typed while idle and a slash command are not queued', async ($, on) => {
  const status = world(on)

  await submit($, 'idle prompt')
  await $.turn.start({ text: 'idle prompt', turnId: 't-1' })
  await submit($, '/cockpit')

  expect(status.every(text => text === undefined)).toBe(true)
})

test('shows nothing while the hub lists it as off', async ($, on) => {
  const status = world(on)
  on('state.get', { plugin: 'cockpit', key: 'off' }, () => ({ value: { value: ['queue-status'], version: 1 } }))

  await $.turn.start({ text: 'first', turnId: 't-1' })
  await submit($, 'second')

  expect(status.every(text => text === undefined)).toBe(true)
})

test('speaks the language set in the hub', async ($, on) => {
  const status = world(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  await $.turn.start({ text: 'first', turnId: 't-1' })
  await submit($, 'second')
  await submit($, 'third')

  expect(status.at(-1)).toBe('fila 2 prompts esperando')
})

const queued = (agentId?: string) =>
  ({
    door: 'attachment',
    origin: { kind: 'engine' },
    uuid: `u-${agentId ?? 'main'}`,
    agentId,
    message: { type: 'attachment', name: 'queued_command', content: [] },
  }) as never

test('does not count a prompt that a hook beneath dropped', async ($, on) => {
  const status: (string | undefined)[] = []
  on('turn.start', (_$, e) => ({ turnId: e.turnId }))
  on('prompt.submit', (_$, e) => (e.text === 'secret' ? { drop: 'blocked' } : { text: e.text }))
  on('ui.status', (_$, e) => {
    status.push(e.text)

    return { value: undefined }
  })

  await $.turn.start({ text: 'first', turnId: 't-1' })
  await submit($, 'secret')
  expect(status.every(text => text === undefined)).toBe(true)

  await submit($, 'kept')
  expect(status.at(-1)).toBe('queue 1 prompt waiting')
})

test('ignores queued commands and turn ends of subagents', async ($, on) => {
  const status = world(on)

  await $.turn.start({ text: 'first', turnId: 't-1' })
  await submit($, 'second')
  await $.session.append(queued('a1'))
  expect(status.at(-1)).toBe('queue 1 prompt waiting')

  await $.turn.complete({ ...TURN, agentId: 'a1' } as never)
  await submit($, 'third')
  expect(status.at(-1)).toBe('queue 2 prompts waiting')
})

test('starts idle and empty again with a new session', async ($, on) => {
  const status = world(on)
  on('session.start', (_$, e) => ({ cwd: e.cwd }))

  await $.turn.start({ text: 'first', turnId: 't-1' })
  await submit($, 'second')
  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })
  const drawn = status.length
  await submit($, 'typed while idle')
  expect(status).toHaveLength(drawn)

  await $.turn.start({ text: 'x', turnId: 't-2' })
  await submit($, 'queued again')
  expect(status.at(-1)).toBe('queue 1 prompt waiting')
})

test('speaks Spanish when the hub is set to es', async ($, on) => {
  const status = world(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  await $.turn.start({ text: 'first', turnId: 't-1' })
  await submit($, 'second')
  expect(status.at(-1)).toBe('cola 1 prompt esperando')
})
