import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'
import type { Engine, MockClock } from 'claude-code/testing'

const START = { cwd: '/project', surface: 'terminal', isInteractive: true } as const
const DONE = { answer: '', durationMs: 5000, isAborted: false, turnId: 't-1', reason: 'answer' } as const
const MINUTE = 60000
const ANSWER = { result: { stdout: '', stderr: '', interrupted: false } }

// Local time on 2026-10-13, whatever the machine's zone.
const at = (hours: number, minutes: number): number => new Date(2026, 9, 13, hours, minutes).getTime()

const dayend = (args: string) => ({
  command: 'dayend',
  args,
  origin: { kind: 'composer' } as const,
  presentation: { isFullscreen: true, columns: 120 },
})

// The world beneath the mod: answers the session, the command, the prompt, the turn and the writes, and records every toast.
const world = (on: On, toasts: string[]) => {
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('command.register', (_$, e) => ({ value: { command: e.name } }))
  on('prompt.submit', (_$, e) => ({ text: e.text }))
  on('turn.complete', (_$, e) => ({ text: e.answer }))
  on('tool.call', { tool: 'Write' }, () => ANSWER)
  on('ui.toast', (_$, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })
}

// A turn of work: one prompt, `edits` writes, one finished turn.
const work = async ($: Engine, edits: number) => {
  await $.prompt.submit({ text: 'go', wait: false, origin: { kind: 'composer' } })

  for (let i = 0; i < edits; i += 1) {
    await $.tool.call({ tool: 'Write', file_path: `/project/f${i}.ts`, content: 'x', tool_use_id: `w-${i}` })
  }

  await $.turn.complete(DONE)
}

const through = async (clock: MockClock, hours: number, minutes: number) => clock.set(at(hours, minutes))

test('sums up the day once, at the set hour', async ($, on) => {
  mock.store(on)
  const clock = mock.clock(on, { now: at(9, 0) })
  const toasts: string[] = []
  world(on, toasts)

  await $.session.start(START)
  await work($, 3)
  await clock.advance(MINUTE)
  await work($, 2)
  await through(clock, 17, 59)
  expect(toasts).toEqual([])

  await through(clock, 18, 1)
  expect(toasts).toEqual(['Done for today? 2 prompts, 2 turns, 5 edits. Good work.'])

  await through(clock, 18, 30)
  await work($, 1)
  await through(clock, 19, 0)
  expect(toasts).toHaveLength(1)
})

test('stays quiet on a day without work, and long after the hour', async ($, on) => {
  mock.store(on)
  const clock = mock.clock(on, { now: at(9, 0) })
  const toasts: string[] = []
  world(on, toasts)

  await $.session.start(START)
  await through(clock, 18, 5)
  expect(toasts).toEqual([])

  // The first prompt of the day arrives after the summary window: the summary is not for it.
  await through(clock, 21, 0)
  await work($, 1)
  await through(clock, 21, 30)
  expect(toasts).toEqual([])
})

test('/dayend sets, shows and turns off the hour', async ($, on) => {
  mock.store(on)
  const clock = mock.clock(on, { now: at(9, 0) })
  const toasts: string[] = []
  world(on, toasts)

  await $.session.start(START)
  expect((await $.command.run(dayend(''))).text).toContain('Day summary at 18:00.')
  expect((await $.command.run(dayend('7pm'))).text).toBe('Give an hour as HH:MM, like /dayend 18:00, or off.')
  expect((await $.command.run(dayend('25:00'))).text).toBe('Give an hour as HH:MM, like /dayend 18:00, or off.')
  expect((await $.command.run(dayend('9:30'))).text).toBe('Day summary at 09:30.')

  await work($, 1)
  await through(clock, 9, 31)
  expect(toasts).toEqual(['Done for today? 1 prompt, 1 turn, 1 edit. Good work.'])

  expect((await $.command.run(dayend('off'))).text).toBe('Day summary turned off.')
  expect((await $.command.run(dayend(''))).text).toContain('is off')
})

test('off keeps the summary quiet', async ($, on) => {
  mock.store(on, { 'dayend:time': 'off' })
  const clock = mock.clock(on, { now: at(9, 0) })
  const toasts: string[] = []
  world(on, toasts)

  await $.session.start(START)
  await work($, 2)
  await through(clock, 18, 10)

  expect(toasts).toEqual([])
})

test('speaks the language set in the hub', async ($, on) => {
  mock.store(on)
  const clock = mock.clock(on, { now: at(9, 0) })
  const toasts: string[] = []
  world(on, toasts)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  await $.session.start(START)
  await work($, 4)
  await through(clock, 18, 2)

  expect(toasts).toEqual(['Por hoje chega? 1 prompt, 1 turno, 4 edições. Bom trabalho.'])
})
