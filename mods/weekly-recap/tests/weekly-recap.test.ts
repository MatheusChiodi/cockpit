import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'

const START = { cwd: '/project', surface: 'terminal', isInteractive: true } as const
const PROMPT = { text: 'go', wait: false, origin: { kind: 'composer' } } as const

// Local time: 2026-10-13 is a Tuesday; the week before ran from Monday the 5th to Sunday the 11th.
const at = (day: number, hours = 10): number => new Date(2026, 9, day, hours, 0).getTime()

const LAST_WEEK = {
  '2026-10-05': { sessions: 2, prompts: 30 },
  '2026-10-07': { sessions: 3, prompts: 40 },
  '2026-10-11': { sessions: 1, prompts: 5 },
  // Before the week: not counted.
  '2026-10-04': { sessions: 9, prompts: 99 },
}

// The world beneath the mod: answers the session and the prompt, and records every toast.
const world = (on: On, toasts: string[]) => {
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('prompt.submit', (_$, e) => ({ text: e.text }))
  on('ui.toast', (_$, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })
}

test('the first session of a new week brings last week once', async ($, on) => {
  mock.store(on, { week: '2026-10-05', days: LAST_WEEK })
  const clock = mock.clock(on, { now: at(13) })
  const toasts: string[] = []
  world(on, toasts)

  await $.session.start(START)
  expect(toasts).toEqual(['Last week: 3 days active, 6 sessions, 75 prompts'])

  // The same week again: nothing.
  await clock.set(at(14))
  await $.session.start(START)
  expect(toasts).toHaveLength(1)
})

test('stays quiet within the same week', async ($, on) => {
  mock.store(on, { week: '2026-10-12', days: LAST_WEEK })
  mock.clock(on, { now: at(13) })
  const toasts: string[] = []
  world(on, toasts)

  await $.session.start(START)

  expect(toasts).toHaveLength(0)
})

test('on the very first run it only starts counting', async ($, on) => {
  mock.store(on)
  mock.clock(on, { now: at(13) })
  const toasts: string[] = []
  world(on, toasts)

  await $.session.start(START)

  expect(toasts).toHaveLength(0)
})

test('counts sessions and prompts by local day, then reports them the next week', async ($, on) => {
  mock.store(on)
  const clock = mock.clock(on, { now: at(6) })
  const toasts: string[] = []
  world(on, toasts)

  await $.session.start(START)
  await $.prompt.submit(PROMPT)
  await $.prompt.submit(PROMPT)
  await $.prompt.submit({ ...PROMPT, origin: { kind: 'scheduled-trigger' } })
  await clock.set(at(8))
  await $.session.start(START)
  await $.prompt.submit(PROMPT)
  expect(toasts).toHaveLength(0)

  await clock.set(at(13))
  await $.session.start(START)
  expect(toasts).toEqual(['Last week: 2 days active, 2 sessions, 3 prompts'])
})

test('stays quiet when last week had no use', async ($, on) => {
  mock.store(on, { week: '2026-09-28', days: {} })
  mock.clock(on, { now: at(13) })
  const toasts: string[] = []
  world(on, toasts)

  await $.session.start(START)

  expect(toasts).toHaveLength(0)
})

test('speaks the language set in the hub', async ($, on) => {
  mock.store(on, { week: '2026-10-05', days: LAST_WEEK })
  mock.clock(on, { now: at(13) })
  const toasts: string[] = []
  world(on, toasts)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  await $.session.start(START)

  expect(toasts[0]).toBe('Semana passada: 3 dias ativos, 6 sessões, 75 prompts')
})
