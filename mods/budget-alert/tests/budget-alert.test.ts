import { expect, test } from 'claude-code/testing'

const SENT = { value: { isSent: true, channel: 'terminal_bell' } } as const

const measure = (usd: number) => ({ context: { window: 200000 }, rateLimits: [], cost: { usd }, changed: ['cost' as const] })

const budget = (args: string) =>
  ({ command: 'budget', args, origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 80 } }) as const

test('toasts at 80% and notifies once when the cost passes the budget', async ($, on) => {
  const toasts: string[] = []
  const sent: string[] = []
  on('session.measure', (_, e) => ({ changed: e.changed }))
  on('ui.toast', (_, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })
  on('ui.notify', (_, e) => {
    sent.push(e.text)

    return SENT
  })

  const answer = await $.command.run(budget('5'))
  expect(answer.text).toBe('Session budget set to $5.00.')

  await $.session.measure(measure(3.9))
  expect(toasts).toEqual([])

  await $.session.measure(measure(4.1))
  await $.session.measure(measure(4.5))
  expect(toasts).toEqual(['Budget: $4.10 of $5.00 (80%)'])
  expect(sent).toEqual([])

  await $.session.measure(measure(5.2))
  await $.session.measure(measure(6))
  expect(sent).toEqual(['Session budget passed: $5.20 of $5.00.'])
  expect(toasts).toHaveLength(1)
})

test('off removes the budget, and a bad value shows the usage', async ($, on) => {
  const sent: string[] = []
  on('session.measure', (_, e) => ({ changed: e.changed }))
  on('ui.notify', (_, e) => {
    sent.push(e.text)

    return SENT
  })

  expect((await $.command.run(budget('abc'))).text).toBe('Usage: /budget <usd> | off')
  expect((await $.command.run(budget('-3'))).text).toBe('Usage: /budget <usd> | off')

  await $.command.run(budget('1'))
  expect((await $.command.run(budget('off'))).text).toBe('Session budget removed.')
  expect((await $.command.run(budget(''))).text).toContain('No session budget')

  await $.session.measure(measure(50))
  expect(sent).toEqual([])
})

test('speaks the language set in the hub', async ($, on) => {
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  const answer = await $.command.run(budget('2,5'))
  expect(answer.text).toBe('Orçamento da sessão definido em US$ 2.50.')
})

test('tells the budget in force, and takes a leading dollar sign', async $ => {
  expect((await $.command.run(budget('$12'))).text).toBe('Session budget set to $12.00.')
  expect((await $.command.run(budget(''))).text).toBe('Session budget: $12.00.')
  expect((await $.command.run(budget('0'))).text).toBe('Usage: /budget <usd> | off')
  expect((await $.command.run(budget(''))).text).toBe('Session budget: $12.00.')
})

test('a jump straight past the budget notifies without the 80% toast', async ($, on) => {
  const toasts: string[] = []
  const sent: string[] = []
  on('session.measure', (_, e) => ({ changed: e.changed }))
  on('ui.toast', (_, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })
  on('ui.notify', (_, e) => {
    sent.push(e.text)

    return SENT
  })

  await $.command.run(budget('1'))
  await $.session.measure({ context: { window: 200000 }, rateLimits: [], changed: ['context' as const] })
  await $.session.measure(measure(1.5))
  await $.session.measure(measure(0.9))
  expect(sent).toEqual(['Session budget passed: $1.50 of $1.00.'])
  expect(toasts).toEqual([])
})

test('setting a new budget arms the alerts again', async ($, on) => {
  const toasts: string[] = []
  const sent: string[] = []
  on('session.measure', (_, e) => ({ changed: e.changed }))
  on('ui.toast', (_, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })
  on('ui.notify', (_, e) => {
    sent.push(e.text)

    return SENT
  })

  await $.command.run(budget('1'))
  await $.session.measure(measure(1.2))
  await $.command.run(budget('2'))
  await $.session.measure(measure(1.7))
  await $.session.measure(measure(2.1))

  expect(toasts).toEqual(['Budget: $1.70 of $2.00 (80%)'])
  expect(sent).toEqual(['Session budget passed: $1.20 of $1.00.', 'Session budget passed: $2.10 of $2.00.'])
})

test('speaks Spanish when the hub says so', async ($, on) => {
  const toasts: string[] = []
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))
  on('session.measure', (_, e) => ({ changed: e.changed }))
  on('ui.toast', (_, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })

  expect((await $.command.run(budget(''))).text).toBe('Sin presupuesto en la sesión. Fíjalo con /budget <usd>.')
  expect((await $.command.run(budget('10'))).text).toBe('Presupuesto de la sesión fijado en US$ 10.00.')
  await $.session.measure(measure(8))
  expect(toasts).toEqual(['Presupuesto: US$ 8.00 de US$ 10.00 (80%)'])
  expect((await $.command.run(budget('off'))).text).toBe('Presupuesto de la sesión quitado.')
})
