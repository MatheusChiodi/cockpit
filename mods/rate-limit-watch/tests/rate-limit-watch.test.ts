import { expect, test } from 'claude-code/testing'

const PT = { value: { value: 'pt', version: 1 } } as const

const LIMITS = {
  command: 'limits',
  args: '',
  origin: { kind: 'composer' } as const,
  presentation: { isFullscreen: true, columns: 120 },
}

const usage = (rateLimits: { kind: string; percentUsed: number; resetsAt?: string }[]) => ({
  value: { startedAt: 0, context: { window: 200000 }, rateLimits },
})

const measure = (percentUsed: number, kind = 'five_hour') => ({
  context: { window: 200000 },
  rateLimits: [{ kind, percentUsed }],
  changed: [],
})

test('/limits lists each window with its percent and reset time', async ($, on) => {
  on(
    'session.usage',
    () => usage([{ kind: 'five_hour', percentUsed: 40, resetsAt: '2026-06-15T15:00:00Z' }, { kind: 'seven_day', percentUsed: 12 }]),
  )

  const lines = ((await $.command.run(LIMITS)).text ?? '').split('\n')
  expect(lines[0]).toMatch(/^5h window: 40% \(resets .+\)$/)
  expect(lines[1]).toBe('7-day window: 12%')
})

test('/limits says so when there is no reading', async ($, on) => {
  on('session.usage', () => usage([]))

  expect((await $.command.run(LIMITS)).text).toContain('No rate limit reading')
})

test('toasts once per threshold step and again after a reset', async ($, on) => {
  const toasts: string[] = []
  on('session.measure', () => ({ changed: [] }))
  on('ui.toast', ($, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })

  await $.session.measure(measure(50))
  expect(toasts).toHaveLength(0)

  await $.session.measure(measure(76))
  await $.session.measure(measure(80))
  expect(toasts).toEqual(['Rate limit: 5h window at 76%'])

  await $.session.measure(measure(91))
  await $.session.measure(measure(96))
  expect(toasts).toHaveLength(3)
  expect(toasts[2]).toBe('Rate limit: 5h window at 96%')

  // The window reset: the warning applies again.
  await $.session.measure(measure(10))
  await $.session.measure(measure(80))
  expect(toasts).toHaveLength(4)

  // Another window warns on its own.
  await $.session.measure(measure(80, 'seven_day'))
  expect(toasts.at(-1)).toBe('Rate limit: 7-day window at 80%')
})

test('speaks the language set in the hub', async ($, on) => {
  const toasts: string[] = []
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => PT)
  on('session.usage', () => usage([{ kind: 'seven_day', percentUsed: 33 }]))
  on('session.measure', () => ({ changed: [] }))
  on('ui.toast', ($, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })

  expect((await $.command.run(LIMITS)).text).toBe('janela de 7 dias: 33%')
  await $.session.measure(measure(90))
  expect(toasts).toEqual(['Rate limit: janela de 5h em 90%'])
})

const toasting = (on: any) => {
  const toasts: string[] = []
  on('session.measure', () => ({ changed: [] }))
  on('ui.toast', (_: unknown, e: { text: string }) => {
    toasts.push(e.text)

    return { value: undefined }
  })

  return toasts
}

test('a jump straight past 95% toasts once', async ($, on) => {
  const toasts = toasting(on)

  await $.session.measure(measure(97))
  await $.session.measure(measure(99))
  expect(toasts).toEqual(['Rate limit: 5h window at 97%'])
})

test('the toast says when the window resets', async ($, on) => {
  const toasts = toasting(on)

  await $.session.measure({
    context: { window: 200000 },
    rateLimits: [{ kind: 'seven_day', percentUsed: 92, resetsAt: '2026-06-15T15:00:00Z' }],
    changed: [],
  } as never)
  expect(toasts[0]).toMatch(/^Rate limit: 7-day window at 92% \(resets .+\)$/)
})

test('an unknown window kind is shown by its raw name', async ($, on) => {
  const toasts = toasting(on)
  on('session.usage', () => usage([{ kind: 'weekly_opus', percentUsed: 5 }]))

  expect((await $.command.run(LIMITS)).text).toBe('weekly_opus: 5%')
  await $.session.measure(measure(75, 'weekly_opus'))
  expect(toasts).toEqual(['Rate limit: weekly_opus at 75%'])
})

test('registers /limits and speaks Spanish', async ($, on) => {
  const toasts = toasting(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  const described: string[] = []
  on('command.register', (_$, e) => {
    described.push(`${e.name}: ${e.description}`)

    return { value: { command: e.name } }
  })
  on('session.usage', () => usage([]))

  await $.session.start({ cwd: '/p', surface: 'terminal', isInteractive: true })
  expect(described).toEqual(['limits: Muestra el uso de las ventanas de rate limit de la cuenta'])
  expect((await $.command.run(LIMITS)).text).toContain('Sin lectura de rate limit')
  await $.session.measure(measure(80, 'spend_limit'))
  expect(toasts).toEqual(['Rate limit: límite de gasto al 80%'])
})
