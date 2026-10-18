import { expect, mock, test } from 'claude-code/testing'

const SENT = { value: { isSent: true, channel: 'terminal_bell' } } as const

const measure = (usd: number) => ({ context: { window: 200000 }, rateLimits: [], cost: { usd }, changed: ['cost' as const] })

const daybudget = (args: string) =>
  ({ command: 'daybudget', args, origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 80 } }) as const

test('notifies once when the day total passes the budget, across sessions', async ($, on) => {
  const clock = mock.clock(on, { now: Date.parse('2030-03-10T12:00:00') })
  const sent: string[] = []
  // The sessions that spent earlier today are already in the store.
  const date = new Date(clock.now())
  const pad = (n: number): string => String(n).padStart(2, '0')
  const key = `daybudget:${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  mock.store(on, { 'daybudget:limit': 10, [key]: { sessions: { earlier: 7 }, isAlerted: false } })
  on('session.id', () => ({ value: 'today' }))
  on('session.measure', (_, e) => ({ changed: e.changed }))
  on('ui.notify', (_, e) => {
    sent.push(e.text)

    return SENT
  })

  await $.session.measure(measure(2))
  expect(sent).toEqual([])

  await $.session.measure(measure(3.5))
  await $.session.measure(measure(4))
  expect(sent).toEqual(['Daily budget passed: $10.50 of $10.00.'])
})

test('sets, shows and removes the budget', async ($, on) => {
  mock.clock(on, { now: Date.parse('2030-03-10T12:00:00') })
  mock.store(on)

  expect((await $.command.run(daybudget(''))).text).toContain('No daily budget')
  expect((await $.command.run(daybudget('x'))).text).toBe('Usage: /daybudget <usd> | off')
  expect((await $.command.run(daybudget('20'))).text).toBe('Daily budget set to $20.00 (today: $0.00).')
  expect((await $.command.run(daybudget(''))).text).toBe('Daily budget: $20.00 (today: $0.00).')
  expect((await $.command.run(daybudget('off'))).text).toBe('Daily budget removed.')
})

test('speaks the language set in the hub', async ($, on) => {
  mock.clock(on, { now: Date.parse('2030-03-10T12:00:00') })
  mock.store(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  expect((await $.command.run(daybudget('5'))).text).toBe('Orçamento do dia definido em US$ 5.00 (hoje: US$ 0.00).')
})

const NOON = Date.parse('2030-03-10T12:00:00')

const keyOf = (ms: number): string => {
  const date = new Date(ms)
  const pad = (n: number): string => String(n).padStart(2, '0')

  return `daybudget:${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

// The session beneath the mod; returns the notifications sent.
const session = (on: any) => {
  const sent: string[] = []
  on('session.id', () => ({ value: 's1' }))
  on('session.measure', (_: unknown, e: { changed: string[] }) => ({ changed: e.changed }))
  on('ui.notify', (_: unknown, e: { text: string }) => {
    sent.push(e.text)

    return SENT
  })

  return sent
}

test('reads a dollar sign and a decimal comma, refuses zero and negatives', async ($, on) => {
  mock.clock(on, { now: NOON })
  mock.store(on)

  expect((await $.command.run(daybudget('$7,5'))).text).toBe('Daily budget set to $7.50 (today: $0.00).')
  expect((await $.command.run(daybudget('0'))).text).toBe('Usage: /daybudget <usd> | off')
  expect((await $.command.run(daybudget('-3'))).text).toBe('Usage: /daybudget <usd> | off')
  expect((await $.command.run(daybudget(''))).text).toBe('Daily budget: $7.50 (today: $0.00).')
})

test('adds what this session spent to the day, and leaves other days out', async ($, on) => {
  const yesterday = keyOf(NOON - 24 * 3600 * 1000)
  mock.clock(on, { now: NOON })
  mock.store(on, {
    'daybudget:limit': 50,
    [yesterday]: { sessions: { old: 30 }, isAlerted: true },
    [keyOf(NOON)]: { sessions: { other: 1.25 }, isAlerted: false },
  })
  session(on)

  await $.session.measure(measure(2))
  await $.session.measure(measure(3))
  expect((await $.command.run(daybudget(''))).text).toBe('Daily budget: $50.00 (today: $4.25).')
})

test('ignores measures where the cost did not change', async ($, on) => {
  mock.clock(on, { now: NOON })
  mock.store(on, { 'daybudget:limit': 1 })
  const sent = session(on)

  await $.session.measure({ context: { window: 200000 }, rateLimits: [], cost: { usd: 5 }, changed: ['context'] })
  expect(sent).toEqual([])
  expect((await $.command.run(daybudget(''))).text).toBe('Daily budget: $1.00 (today: $0.00).')
})

test('a new limit gives a new alert', async ($, on) => {
  mock.clock(on, { now: NOON })
  mock.store(on, { 'daybudget:limit': 1 })
  const sent = session(on)

  await $.session.measure(measure(2))
  await $.session.measure(measure(2.5))
  expect(sent).toEqual(['Daily budget passed: $2.00 of $1.00.'])

  await $.command.run(daybudget('2'))
  await $.session.measure(measure(3))
  expect(sent).toEqual(['Daily budget passed: $2.00 of $1.00.', 'Daily budget passed: $3.00 of $2.00.'])
})

test('never alerts without a limit', async ($, on) => {
  mock.clock(on, { now: NOON })
  mock.store(on)
  const sent = session(on)

  await $.session.measure(measure(1000))
  expect(sent).toEqual([])
})

test('speaks Spanish when the hub is set to es', async ($, on) => {
  mock.clock(on, { now: NOON })
  mock.store(on, { 'daybudget:limit': 1 })
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))
  const sent = session(on)

  await $.session.measure(measure(1.5))
  expect(sent).toEqual(['Presupuesto del día superado: US$ 1.50 de US$ 1.00.'])
  expect((await $.command.run(daybudget('off'))).text).toBe('Presupuesto del día quitado.')
  expect((await $.command.run(daybudget(''))).text).toBe('Sin presupuesto del día. Fíjalo con /daybudget <usd>.')
})
