import { expect, mock, test } from 'claude-code/testing'

const PT = { value: { value: 'pt', version: 1 } } as const

const START = { cwd: '/p', surface: 'terminal', isInteractive: true } as const
const FIFTY = 50 * 60000

test('reminds every 50 minutes with a rotating tip', async ($, on) => {
  const clock = mock.clock(on)
  const toasts: { text: string; timeoutMs?: number }[] = []
  on('session.start', () => ({ cwd: '/p' }))
  on('ui.toast', ($, e) => {
    toasts.push({ text: e.text, timeoutMs: e.timeoutMs })

    return { value: undefined }
  })

  await $.session.start(START)
  await clock.advance(FIFTY - 1)
  expect(toasts).toHaveLength(0)

  await clock.advance(1)
  expect(toasts).toEqual([
    { text: '50 min of session. Look far away for 20 seconds: the 20-20-20 rule.', timeoutMs: 20000 },
  ])

  await clock.advance(FIFTY)
  expect(toasts[1]?.text).toBe('100 min of session. A quick walk helps more than one more prompt.')

  // The tips wrap around after the last one.
  await clock.advance(FIFTY * 2)
  expect(toasts).toHaveLength(4)
  expect(toasts[3]?.text).toBe('200 min of session. Stand up, stretch and drink some water.')
})

test('speaks the language set in the hub', async ($, on) => {
  const clock = mock.clock(on)
  const toasts: string[] = []
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => PT)
  on('session.start', () => ({ cwd: '/p' }))
  on('ui.toast', ($, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })

  await $.session.start(START)
  await clock.advance(FIFTY)
  expect(toasts[0]).toBe('50 min de sessão. Olhe para longe por 20 segundos: regra 20-20-20.')
})
