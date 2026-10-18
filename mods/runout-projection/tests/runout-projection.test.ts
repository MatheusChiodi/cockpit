import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'

const MINUTE = 60000
const START = Date.UTC(2026, 9, 14, 12, 0)

const cmd = { command: 'runout', args: '', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 80 } } as const

const measure = (percentUsed: number, resetsInMinutes: number) => ({
  context: { window: 200000 },
  rateLimits: [{ kind: 'five_hour', percentUsed, resetsAt: new Date(START + resetsInMinutes * MINUTE).toISOString() }],
  changed: ['rateLimits' as const],
})

const world = (on: On, toasts: string[]) => {
  on('session.measure', (_$, e) => ({ changed: e.changed }))
  on('ui.toast', (_$, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })
}

test('projects the run-out and toasts once when it falls before the reset', async ($, on) => {
  const clock = mock.clock(on, { now: START })
  const toasts: string[] = []
  world(on, toasts)

  await $.session.measure(measure(20, 300))
  await clock.advance(30 * MINUTE)
  await $.session.measure(measure(50, 270))
  await clock.advance(5 * MINUTE)
  await $.session.measure(measure(55, 265))

  expect(toasts).toEqual(['5h window at 50%: at this pace it runs out in 50m, resets in 4h 00m'])
  expect((await $.command.run(cmd)).text).toBe('5h window: 55%, runs out in 45m, resets in 3h 50m')
})

test('stays quiet when the window lasts until its reset or has no pace yet', async ($, on) => {
  const clock = mock.clock(on, { now: START })
  const toasts: string[] = []
  world(on, toasts)

  await $.session.measure(measure(10, 200))
  expect((await $.command.run(cmd)).text).toBe('5h window: 10%, not enough pace data yet')
  await clock.advance(20 * MINUTE)
  await $.session.measure(measure(16, 180))
  expect(toasts).toEqual([])
  expect((await $.command.run(cmd)).text).toBe('5h window: 16%, lasts until it resets at this pace')
})

test('starts the pace again after a window reset', async ($, on) => {
  const clock = mock.clock(on, { now: START })
  const toasts: string[] = []
  world(on, toasts)

  await $.session.measure(measure(60, 200))
  await clock.advance(20 * MINUTE)
  await $.session.measure(measure(90, 180))
  expect(toasts).toHaveLength(1)

  await clock.advance(MINUTE)
  await $.session.measure(measure(2, 300))
  expect((await $.command.run(cmd)).text).toBe('5h window: 2%, not enough pace data yet')
})

test('speaks the language set in the hub', async ($, on) => {
  mock.clock(on, { now: START })
  world(on, [])
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  expect((await $.command.run(cmd)).text).toBe('Nenhuma janela de limite informada (fora de assinatura, ou sem resposta ainda).')
})

const window = (kind: string, percentUsed: number, resetsAt?: string) => ({
  context: { window: 200000 },
  rateLimits: [{ kind, percentUsed, ...(resetsAt === undefined ? {} : { resetsAt }) }],
  changed: ['rateLimits' as const],
})

test('says no window is reported before any reading', async ($, on) => {
  mock.clock(on, { now: START })
  world(on, [])

  expect((await $.command.run(cmd)).text).toBe('No rate-limit window reported (not on a subscription, or no response yet).')
})

test('projects a window without a reset time, and names an unknown kind as is', async ($, on) => {
  const clock = mock.clock(on, { now: START })
  const toasts: string[] = []
  world(on, toasts)

  await $.session.measure(window('spend_limit', 10) as never)
  await $.session.measure(window('weekly_opus', 5) as never)
  await clock.advance(20 * MINUTE)
  await $.session.measure(window('spend_limit', 40) as never)
  await $.session.measure(window('weekly_opus', 6) as never)

  expect(toasts).toEqual(['spend limit at 40%: at this pace it runs out in 40m'])
  expect((await $.command.run(cmd)).text).toBe(
    ['spend limit: 40%, runs out in 40m', 'weekly_opus: 6%, not enough pace data yet'].join('\n'),
  )
})

test('toasts a window only once while it keeps climbing', async ($, on) => {
  const clock = mock.clock(on, { now: START })
  const toasts: string[] = []
  world(on, toasts)

  await $.session.measure(window('seven_day', 10) as never)
  for (const percent of [30, 50, 70]) {
    await clock.advance(15 * MINUTE)
    await $.session.measure(window('seven_day', percent) as never)
  }

  expect(toasts).toHaveLength(1)
  expect(toasts[0]).toContain('7-day window at 30%')
})

test('speaks Spanish in the toast and the command', async ($, on) => {
  const clock = mock.clock(on, { now: START })
  const toasts: string[] = []
  world(on, toasts)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  await $.session.measure(measure(20, 300))
  await clock.advance(30 * MINUTE)
  await $.session.measure(measure(50, 270))

  expect(toasts).toEqual(['ventana de 5h al 50%: a este ritmo se agota en 50m, se renueva en 4h 00m'])
  expect((await $.command.run(cmd)).text).toBe('ventana de 5h: 50%, se agota en 50m, se renueva en 4h 00m')
})
