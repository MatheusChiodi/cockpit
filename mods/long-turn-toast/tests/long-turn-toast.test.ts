import { expect, test } from 'claude-code/testing'
import type { On } from 'claude-code'
import type { Engine } from 'claude-code/testing'

const START = { cwd: '/project', surface: 'terminal', isInteractive: true } as const
const SECOND = 1000
const MINUTE = 60000

// The world beneath the mod: answers the session and the turn, and records every toast.
const world = (on: On, toasts: string[]) => {
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('turn.complete', (_$, e) => ({ text: e.answer }))
  on('ui.toast', (_$, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })
}

const finish = ($: Engine, durationMs: number, extra: { reason?: 'aborted'; agentId?: string } = {}) =>
  $.turn.complete({
    answer: '',
    durationMs,
    isAborted: extra.reason === 'aborted',
    turnId: 't-1',
    reason: extra.reason ?? 'answer',
    ...(extra.agentId === undefined ? {} : { agentId: extra.agentId }),
  } as never)

const usual = async ($: Engine) => {
  for (const seconds of [50, 60, 70, 60, 65]) {
    await finish($, seconds * SECOND)
  }
}

test('speaks when a turn is three times the median and at least two minutes', async ($, on) => {
  const toasts: string[] = []
  world(on, toasts)

  await $.session.start(START)
  await usual($)
  await finish($, 7 * MINUTE)

  expect(toasts).toEqual(['This turn took 7m 00s, usually about 1m 00s. Still on track?'])
})

test('stays quiet below two minutes, below three times, or without enough history', async ($, on) => {
  const toasts: string[] = []
  world(on, toasts)

  await $.session.start(START)
  await finish($, 10 * MINUTE)
  await finish($, 10 * MINUTE)
  await usual($)
  expect(toasts).toEqual([])

  // Median is now about 1 min: 2.5 min is under three times, 100 s is under two minutes.
  await finish($, 150 * SECOND)
  await finish($, 100 * SECOND)
  expect(toasts).toEqual([])
})

test('ignores interrupted turns and subagents, in the median and in the toast', async ($, on) => {
  const toasts: string[] = []
  world(on, toasts)

  await $.session.start(START)
  await usual($)
  await finish($, 9 * MINUTE, { reason: 'aborted' })
  await finish($, 9 * MINUTE, { agentId: 'a1' })

  expect(toasts).toEqual([])
})

test('speaks the language set in the hub', async ($, on) => {
  const toasts: string[] = []
  world(on, toasts)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  await $.session.start(START)
  await usual($)
  await finish($, 8 * MINUTE)

  expect(toasts).toEqual(['Este turno levou 8m 00s, em geral cerca de 1m 00s. Ainda no rumo?'])
})

test('speaks Spanish when the hub is set to es', async ($, on) => {
  const toasts: string[] = []
  world(on, toasts)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  await $.session.start(START)
  await usual($)
  await finish($, 5 * MINUTE + 7 * SECOND)

  expect(toasts).toEqual(['Este turno tardó 5m 07s, normalmente unos 1m 00s. ¿Sigue en rumbo?'])
})

test('two minutes is enough when the usual turn is short', async ($, on) => {
  const toasts: string[] = []
  world(on, toasts)

  await $.session.start(START)
  for (const seconds of [20, 30, 40, 30, 25]) {
    await finish($, seconds * SECOND)
  }
  await finish($, 2 * MINUTE)

  expect(toasts).toEqual(['This turn took 2m 00s, usually about 30s. Still on track?'])
})

test('averages the two middle turns of an even history', async ($, on) => {
  const toasts: string[] = []
  world(on, toasts)

  await $.session.start(START)
  for (const seconds of [10, 20, 40, 50, 60, 70]) {
    await finish($, seconds * SECOND)
  }
  await finish($, 10 * MINUTE)

  expect(toasts).toEqual(['This turn took 10m 00s, usually about 45s. Still on track?'])
})

test('a new session starts the history over', async ($, on) => {
  const toasts: string[] = []
  world(on, toasts)

  await $.session.start(START)
  await usual($)
  await $.session.start(START)
  await finish($, 9 * MINUTE)

  expect(toasts).toEqual([])
})
