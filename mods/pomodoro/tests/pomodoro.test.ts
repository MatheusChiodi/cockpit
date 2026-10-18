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

// Records the status line, toasts and notifications.
const seen = (on: any) => {
  const out = { statuses: [] as (string | undefined)[], toasts: [] as string[], notices: [] as string[] }
  on('ui.status', (_: unknown, e: { text: string | undefined }) => {
    out.statuses.push(e.text)

    return { value: undefined }
  })
  on('ui.toast', (_: unknown, e: { text: string }) => {
    out.toasts.push(e.text)

    return { value: undefined }
  })
  on('ui.notify', (_: unknown, e: { text: string }) => {
    out.notices.push(e.text)

    return { value: { isSent: true, channel: 'kitty' } }
  })

  return out
}

test('a new pomodoro replaces the running one', async ($, on) => {
  const clock = mock.clock(on)
  const out = seen(on)

  await $.command.run(run('10'))
  await clock.advance(5 * 60000)
  expect((await $.command.run(run('3'))).text).toBe('3 min pomodoro started.')
  expect(out.statuses.at(-1)).toBe('focus 3 min')

  await clock.advance(3 * 60000)
  expect(out.toasts).toHaveLength(1)

  await clock.advance(10 * 60000)
  expect(out.toasts).toHaveLength(1)
  expect(out.notices).toHaveLength(1)
})

test('accepts fractional minutes and rounds the countdown up', async ($, on) => {
  const clock = mock.clock(on)
  const out = seen(on)

  expect((await $.command.run(run('1.5'))).text).toBe('1.5 min pomodoro started.')
  expect(out.statuses.at(-1)).toBe('focus 2 min')

  await clock.advance(45000)
  expect(out.statuses.at(-1)).toBe('focus 1 min')

  await clock.advance(45000)
  expect(out.toasts).toEqual(['Pomodoro finished. Time for a break.'])
})

test('stop works in any case and with nothing running', async ($, on) => {
  mock.clock(on)
  const out = seen(on)

  expect((await $.command.run(run('  STOP '))).text).toBe('Pomodoro cancelled.')
  expect(out.statuses).toEqual([undefined])
})

test('accepts the longest pomodoro', async ($, on) => {
  mock.clock(on)
  const out = seen(on)

  expect((await $.command.run(run('240'))).text).toBe('240 min pomodoro started.')
  expect(out.statuses.at(-1)).toBe('focus 240 min')
})

test('speaks Spanish when the hub says so', async ($, on) => {
  const clock = mock.clock(on)
  const out = seen(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  expect((await $.command.run(run('x'))).text).toBe('Uso: /pomodoro [minutos de 1 a 240 | stop]')
  await $.command.run(run('1'))
  await clock.advance(60000)
  expect(out.notices).toEqual(['Pomodoro terminado. Hora de la pausa.'])
  expect((await $.command.run(run('stop'))).text).toBe('Pomodoro cancelado.')
})
