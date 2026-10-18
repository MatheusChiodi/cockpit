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

const recorder = (on: any) => {
  const sent: { text: string; title?: string }[] = []
  on('session.measure', (_: unknown, e: any) => ({ changed: e.changed }))
  on('ui.notify', (_: unknown, e: { text: string; title?: string }) => {
    sent.push({ text: e.text, title: e.title })

    return SENT
  })

  return sent
}

test('notifies at exactly 90%, under the Claude Code title, and without a reset time when none is given', async ($, on) => {
  const sent = recorder(on)

  await $.session.measure(measure(0))
  await $.session.measure(measure(90))
  expect(sent).toEqual([{ text: 'five_hour limit at 90%.', title: 'Claude Code' }])
})

test('leaves the reset time out when it is not a valid date', async ($, on) => {
  const sent = recorder(on)

  await $.session.measure(measure(0))
  await $.session.measure(measure(97, 'not a date'))
  expect(sent.map(item => item.text)).toEqual(['five_hour limit at 97%.'])
})

test('tracks each window on its own', async ($, on) => {
  const sent = recorder(on)
  const both = (five: number, seven: number) => ({
    context: { window: 200000 },
    rateLimits: [
      { kind: 'five_hour', percentUsed: five },
      { kind: 'seven_day', percentUsed: seven },
    ],
    changed: ['rateLimits' as const],
  })

  await $.session.measure(both(0, 0))
  await $.session.measure(both(95, 10))
  await $.session.measure(both(96, 92))
  await $.session.measure(both(97, 93))
  expect(sent.map(item => item.text)).toEqual(['five_hour limit at 95%.', 'seven_day limit at 92%.'])
})

test('speaks Spanish with the reset time, and Portuguese with it', async ($, on) => {
  const sent = recorder(on)
  let lang = 'es'
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: lang, version: 1 } }))

  await $.session.measure(measure(0))
  await $.session.measure(measure(91, '2030-01-01T18:30:00Z'))
  lang = 'pt'
  await $.session.measure(measure(0))
  await $.session.measure(measure(92, '2030-01-01T18:30:00Z'))

  expect(sent[0]?.text).toMatch(/^Límite five_hour al 91%\. Se renueva .+\.$/)
  expect(sent[1]?.text).toMatch(/^Limite five_hour em 92%\. Renova .+\.$/)
})
