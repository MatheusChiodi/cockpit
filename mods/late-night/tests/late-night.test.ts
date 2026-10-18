import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'

const START = { cwd: '/project', surface: 'terminal', isInteractive: true } as const
const PROMPT = { text: 'go', wait: false, origin: { kind: 'composer' } } as const

// Local time on 2026-10-13, whatever the machine's zone.
const at = (hours: number, minutes: number): number => new Date(2026, 9, 13, hours, minutes).getTime()

// The world beneath the mod: answers the session and the prompt, and records every toast.
const world = (on: On, toasts: string[]) => {
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('prompt.submit', (_$, e) => ({ text: e.text }))
  on('ui.toast', (_$, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })
}

test('toasts once per session when used after 23:00', async ($, on) => {
  mock.clock(on, { now: at(23, 40) })
  const toasts: string[] = []
  world(on, toasts)

  await $.session.start(START)
  await $.prompt.submit(PROMPT)
  await $.prompt.submit(PROMPT)

  expect(toasts).toEqual(['It is 23:40. Park the work and pick it up tomorrow.'])

  // A new session may be told again.
  await $.session.start(START)
  await $.prompt.submit(PROMPT)
  expect(toasts).toHaveLength(2)
})

test('the small hours count as late', async ($, on) => {
  mock.clock(on, { now: at(2, 5) })
  const toasts: string[] = []
  world(on, toasts)

  await $.session.start(START)
  await $.prompt.submit(PROMPT)

  expect(toasts).toEqual(['It is 02:05. Park the work and pick it up tomorrow.'])
})

test('stays quiet during the day and before 23:00', async ($, on) => {
  const clock = mock.clock(on, { now: at(14, 0) })
  const toasts: string[] = []
  world(on, toasts)

  await $.session.start(START)
  await $.prompt.submit(PROMPT)
  await clock.set(at(22, 59))
  await $.prompt.submit(PROMPT)

  expect(toasts).toHaveLength(0)

  // Work that runs past 23:00 is caught by the next prompt.
  await clock.set(at(23, 1))
  await $.prompt.submit(PROMPT)
  expect(toasts).toHaveLength(1)
})

test('speaks the language set in the hub', async ($, on) => {
  mock.clock(on, { now: at(23, 10) })
  const toasts: string[] = []
  world(on, toasts)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  await $.session.start(START)
  await $.prompt.submit(PROMPT)

  expect(toasts[0]).toBe('São 23:10. Deixe o trabalho de lado e retome amanhã.')
})

const ANSWER = { result: { stdout: '', stderr: '', interrupted: false } }

test('a tool call late at night also toasts, once', async ($, on) => {
  mock.clock(on, { now: at(0, 15) })
  const toasts: string[] = []
  world(on, toasts)
  on('tool.call', { tool: 'Bash' }, () => ANSWER)

  await $.session.start(START)
  await $.tool.call({ tool: 'Bash', command: 'ls', tool_use_id: 'b-1' })
  await $.tool.call({ tool: 'Bash', command: 'ls', tool_use_id: 'b-2' })
  await $.prompt.submit(PROMPT)

  expect(toasts).toEqual(['It is 00:15. Park the work and pick it up tomorrow.'])
})

test('04:59 is still late, 05:00 no longer is', async ($, on) => {
  mock.clock(on, { now: at(4, 59) })
  const toasts: string[] = []
  world(on, toasts)

  await $.session.start(START)
  await $.prompt.submit(PROMPT)
  expect(toasts).toEqual(['It is 04:59. Park the work and pick it up tomorrow.'])
})

test('05:00 is no longer late', async ($, on) => {
  mock.clock(on, { now: at(5, 0) })
  const toasts: string[] = []
  world(on, toasts)

  await $.session.start(START)
  await $.prompt.submit(PROMPT)
  expect(toasts).toEqual([])
})

test('lets the prompt through unchanged while it toasts', async ($, on) => {
  mock.clock(on, { now: at(23, 30) })
  const toasts: string[] = []
  world(on, toasts)

  await $.session.start(START)
  const entered = await $.prompt.submit({ ...PROMPT, text: 'keep going' })

  expect(entered.text).toBe('keep going')
  expect(toasts).toHaveLength(1)
})

test('speaks Spanish when the hub language is es', async ($, on) => {
  mock.clock(on, { now: at(1, 7) })
  const toasts: string[] = []
  world(on, toasts)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  await $.session.start(START)
  await $.prompt.submit(PROMPT)

  expect(toasts[0]).toBe('Son las 01:07. Deja el trabajo y retómalo mañana.')
})
