import { expect, test } from 'claude-code/testing'

const PT = { value: { value: 'pt', version: 1 } } as const

const measure = (percent: number | undefined, usd?: number) => ({
  context: { window: 200000, percent },
  rateLimits: [],
  cost: usd === undefined ? undefined : { usd },
  changed: [],
})

test('draws the gauge with percent and cost in the status line', async ($, on) => {
  const statuses: (string | undefined)[] = []
  on('session.measure', () => ({ changed: [] }))
  on('ui.toast', () => ({ value: undefined }))
  on('ui.status', ($, e) => {
    statuses.push(e.text)

    return { value: undefined }
  })

  await $.session.measure(measure(42, 0.5))
  await $.session.measure(measure(100))
  expect(statuses).toEqual(['ctx ━━━━────── 42% · $0.50', 'ctx ━━━━━━━━━━ 100%'])
})

test('warns once at 80 and again at 90, and re-arms after a compact', async ($, on) => {
  const toasts: string[] = []
  on('session.measure', () => ({ changed: [] }))
  on('ui.status', () => ({ value: undefined }))
  on('ui.toast', ($, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })

  await $.session.measure(measure(70))
  expect(toasts).toHaveLength(0)

  await $.session.measure(measure(82))
  await $.session.measure(measure(85))
  expect(toasts).toEqual(['Context at 82%. Consider /compact or /clear.'])

  await $.session.measure(measure(91))
  expect(toasts).toHaveLength(2)

  await $.session.measure(measure(20))
  await $.session.measure(measure(81))
  expect(toasts).toHaveLength(3)
})

test('draws nothing while the percent is unknown', async ($, on) => {
  const statuses: (string | undefined)[] = []
  on('session.measure', () => ({ changed: [] }))
  on('ui.status', ($, e) => {
    statuses.push(e.text)

    return { value: undefined }
  })

  await $.session.measure(measure(undefined))
  expect(statuses).toHaveLength(0)
})

test('speaks the language set in the hub', async ($, on) => {
  const statuses: (string | undefined)[] = []
  const toasts: string[] = []
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => PT)
  on('session.measure', () => ({ changed: [] }))
  on('ui.status', ($, e) => {
    statuses.push(e.text)

    return { value: undefined }
  })
  on('ui.toast', ($, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })

  await $.session.measure(measure(95, 1))
  expect(statuses.at(-1)).toBe('ctx ━━━━━━━━━━ 95% · US$ 1.00')
  expect(toasts).toEqual(['Contexto em 95%. Considere /compact ou /clear.'])
})

// The engine beneath the mod; returns the status entries and toasts.
const world = (on: any) => {
  const statuses: (string | undefined)[] = []
  const toasts: string[] = []
  on('session.measure', () => ({ changed: [] }))
  on('ui.status', (_: unknown, e: { text: string | undefined }) => {
    statuses.push(e.text)

    return { value: undefined }
  })
  on('ui.toast', (_: unknown, e: { text: string }) => {
    toasts.push(e.text)

    return { value: undefined }
  })

  return { statuses, toasts }
}

test('speaks Spanish when the hub is set to es', async ($, on) => {
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))
  const { statuses, toasts } = world(on)

  await $.session.measure(measure(83, 2.5))
  expect(statuses).toEqual(['ctx ━━━━━━━━── 83% · US$ 2.50'])
  expect(toasts).toEqual(['Contexto al 83%. Considera /compact o /clear.'])
})

test('rounds the gauge to tenths and keeps it full past 100%', async ($, on) => {
  const { statuses } = world(on)

  await $.session.measure(measure(0))
  await $.session.measure(measure(4))
  await $.session.measure(measure(5))
  await $.session.measure(measure(120))

  expect(statuses).toEqual(['ctx ────────── 0%', 'ctx ────────── 4%', 'ctx ━───────── 5%', 'ctx ━━━━━━━━━━ 120%'])
})

test('jumping straight past 90 warns once', async ($, on) => {
  const { toasts } = world(on)

  await $.session.measure(measure(92))
  await $.session.measure(measure(95))

  expect(toasts).toEqual(['Context at 92%. Consider /compact or /clear.'])
})

test('the exact thresholds count', async ($, on) => {
  const { toasts } = world(on)

  await $.session.measure(measure(79))
  await $.session.measure(measure(80))
  await $.session.measure(measure(90))

  expect(toasts).toEqual(['Context at 80%. Consider /compact or /clear.', 'Context at 90%. Consider /compact or /clear.'])
})
