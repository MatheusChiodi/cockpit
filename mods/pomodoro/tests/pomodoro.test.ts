import { expect, mock, test } from 'claude-code/testing'

const PT = { value: { value: 'pt', version: 1 } } as const

const run = (args: string) => ({
  command: 'pomodoro',
  args,
  origin: { kind: 'composer' } as const,
  presentation: { isFullscreen: true, columns: 120 },
})

test('counts down in the status line and announces the end', async ($, on) => {
  const clock = mock.clock(on)
  const statuses: (string | undefined)[] = []
  const toasts: string[] = []
  const notices: string[] = []
  on('ui.status', ($, e) => {
    statuses.push(e.text)

    return { value: undefined }
  })
  on('ui.toast', ($, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })
  on('ui.notify', ($, e) => {
    notices.push(e.text)

    return { value: { isSent: false, reason: 'no-channel' } }
  })

  const started = await $.command.run(run('2'))
  expect(started.text).toBe('2 min pomodoro started.')
  expect(statuses.at(-1)).toBe('focus 2 min')

  await clock.advance(60000)
  expect(statuses.at(-1)).toBe('focus 1 min')
  expect(toasts).toHaveLength(0)

  await clock.advance(60000)
  expect(statuses.at(-1)).toBeUndefined()
  expect(toasts).toEqual(['Pomodoro finished. Time for a break.'])
  expect(notices).toEqual(['Pomodoro finished. Time for a break.'])
})

test('stop cancels the countdown', async ($, on) => {
  const clock = mock.clock(on)
  const statuses: (string | undefined)[] = []
  const toasts: string[] = []
  on('ui.status', ($, e) => {
    statuses.push(e.text)

    return { value: undefined }
  })
  on('ui.toast', ($, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })
  on('ui.notify', () => ({ value: { isSent: false, reason: 'no-channel' } }))

  await $.command.run(run(''))
  expect(statuses.at(-1)).toBe('focus 25 min')

  const stopped = await $.command.run(run('stop'))
  expect(stopped.text).toBe('Pomodoro cancelled.')
  expect(statuses.at(-1)).toBeUndefined()

  await clock.advance(30 * 60000)
  expect(toasts).toHaveLength(0)
})

test('refuses minutes that are not a number from 1 to 240', async ($, on) => {
  mock.clock(on)
  on('ui.status', () => ({ value: undefined }))

  for (const args of ['abc', '0', '-5', '241']) {
    const answer = await $.command.run(run(args))
    expect(answer.text, args).toBe('Usage: /pomodoro [minutes from 1 to 240 | stop]')
  }
})

test('speaks the language set in the hub', async ($, on) => {
  const clock = mock.clock(on)
  const statuses: (string | undefined)[] = []
  const toasts: string[] = []
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => PT)
  on('ui.status', ($, e) => {
    statuses.push(e.text)

    return { value: undefined }
  })
  on('ui.toast', ($, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })
  on('ui.notify', () => ({ value: { isSent: false, reason: 'no-channel' } }))

  const started = await $.command.run(run('1'))
  expect(started.text).toBe('Pomodoro de 1 min iniciado.')
  expect(statuses.at(-1)).toBe('foco 1 min')

  await clock.advance(60000)
  expect(toasts).toEqual(['Pomodoro concluído. Hora da pausa.'])
})
