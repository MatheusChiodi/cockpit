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
