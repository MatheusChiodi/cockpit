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
