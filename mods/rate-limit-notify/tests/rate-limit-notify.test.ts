import { expect, test } from 'claude-code/testing'

const SENT = { value: { isSent: true, channel: 'terminal_bell' } } as const

const measure = (percentUsed: number, resetsAt?: string) => ({
  context: { window: 200000 },
  rateLimits: [{ kind: 'five_hour', percentUsed, resetsAt }],
  changed: ['rateLimits' as const],
})

test('notifies the first time a window crosses 90%, not again while it stays above', async ($, on) => {
  const sent: string[] = []
  on('session.measure', (_, e) => ({ changed: e.changed }))
  on('ui.notify', (_, e) => {
    sent.push(e.text)

    return SENT
  })

  await $.session.measure(measure(0))
  await $.session.measure(measure(85))
  expect(sent).toEqual([])

  await $.session.measure(measure(91.4, '2030-01-01T18:30:00Z'))
  expect(sent).toHaveLength(1)
  expect(sent[0]).toContain('five_hour limit at 91%')
  expect(sent[0]).toContain('Resets')

  await $.session.measure(measure(95))
  expect(sent).toHaveLength(1)
})

test('arms again once the window resets', async ($, on) => {
  const sent: string[] = []
  on('session.measure', (_, e) => ({ changed: e.changed }))
  on('ui.notify', (_, e) => {
    sent.push(e.text)

    return SENT
  })

  await $.session.measure(measure(0))
  await $.session.measure(measure(92))
  await $.session.measure(measure(3))
  await $.session.measure(measure(93))
  expect(sent).toHaveLength(2)
})

test('speaks the language set in the hub', async ($, on) => {
  const sent: string[] = []
  on('session.measure', (_, e) => ({ changed: e.changed }))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))
  on('ui.notify', (_, e) => {
    sent.push(e.text)

    return SENT
  })

  await $.session.measure({ ...measure(95), rateLimits: [{ kind: 'seven_day', percentUsed: 95 }] })
  expect(sent).toEqual(['Limite seven_day em 95%.'])
})
