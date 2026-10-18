import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'

const START = { cwd: '/project', surface: 'terminal', isInteractive: true } as const
const MINUTE = 60000

const BAND = {
  plugin: 'focus-band',
  component: 'AbovePrompt',
  props: {
    hasSurvey: false,
    isWorking: false,
    maxRows: 10,
    bodyColumns: 100,
    scroll: { offset: 0, bodyRows: 10 },
    view: {},
  },
  viewport: { columns: 120, rows: 40 },
} as const

const focus = (args: string) =>
  ({
    command: 'focus',
    args,
    origin: { kind: 'composer' },
    presentation: { isFullscreen: true, columns: 120 },
  }) as const

type Seen = { toasts: string[]; notes: string[] }

// The world beneath the mod: the session and the command, toasts and notifications recorded, and the empty box the engine would draw.
const world = (on: On): Seen => {
  const seen: Seen = { toasts: [], notes: [] }
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('command.register', (_$, e) => ({ value: { command: e.name } }))
  on('ui.toast', (_$, e) => {
    seen.toasts.push(e.text)

    return { value: undefined }
  })
  on('ui.notify', (_$, e) => {
    seen.notes.push(e.text)

    return { value: { isSent: true, channel: 'kitty' } }
  })
  on('ui.render', { component: 'AbovePrompt' }, ($, e) => {
    const { Box } = $.ui.resolve(e)

    return <Box />
  })

  return seen
}

test('draws the time left while the block runs, and finishes with a toast and a notification', async ($, on) => {
  const clock = mock.clock(on, { now: 1000 * MINUTE })
  const seen = world(on)

  await $.session.start(START)
  expect((await $.command.run(focus('25'))).text).toBe('25 min focus block started.')

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })

    expect(await ui.find({ type: 'Text', text: /FOCUS/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /25 min/ })).toBeDefined()
    await ui.unmount()
  }

  await clock.advance(10 * MINUTE)
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /15 min/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: / of 25/ })).toBeDefined()
  await ui.unmount()
  expect(seen.toasts).toEqual([])

  await clock.advance(16 * MINUTE)
  expect(seen.toasts).toEqual(['Focus block finished. Time for a break.'])
  expect(seen.notes).toEqual(['Focus block finished. Time for a break.'])

  const after = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await after.find({ type: 'Text', text: /FOCUS/ })).toBeUndefined()
  await after.unmount()
})

test('defaults to 25 minutes, and stop cancels the block', async ($, on) => {
  const clock = mock.clock(on, { now: 1000 * MINUTE })
  const seen = world(on)

  await $.session.start(START)
  expect((await $.command.run(focus(''))).text).toBe('25 min focus block started.')
  expect((await $.command.run(focus('stop'))).text).toBe('Focus block cancelled.')

  await clock.advance(60 * MINUTE)
  expect(seen.toasts).toEqual([])

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /FOCUS/ })).toBeUndefined()
  await ui.unmount()
})

test('refuses a bad amount of minutes', async ($, on) => {
  mock.clock(on)
  world(on)

  await $.session.start(START)

  for (const args of ['0', '-5', '241', 'soon']) {
    expect((await $.command.run(focus(args))).text, args).toContain('Usage')
  }
})

test('hides while the hub lists it as off', async ($, on) => {
  mock.clock(on, { now: 1000 * MINUTE })
  world(on)
  on('state.get', { plugin: 'cockpit', key: 'off' }, () => ({ value: { value: ['focus-band'], version: 1 } }))

  await $.session.start(START)
  await $.command.run(focus('10'))

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /FOCUS/ })).toBeUndefined()
  await ui.unmount()
  await $.command.run(focus('stop'))
})

test('speaks the language set in the hub', async ($, on) => {
  mock.clock(on, { now: 1000 * MINUTE })
  world(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  await $.session.start(START)
  expect((await $.command.run(focus('10'))).text).toBe('Bloco de foco de 10 min iniciado.')

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /FOCO/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: / de 10/ })).toBeDefined()
  await ui.unmount()
  await $.command.run(focus('stop'))
})

test('hides while a survey is shown above the prompt', async ($, on) => {
  mock.clock(on, { now: 1000 * MINUTE })
  world(on)

  await $.session.start(START)
  await $.command.run(focus('10'))

  const ui = await $.ui.mount({ ...BAND, props: { ...BAND.props, hasSurvey: true }, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /FOCUS/ })).toBeUndefined()
  await ui.unmount()
  await $.command.run(focus('stop'))
})

test('a new block replaces the running one and finishes only once', async ($, on) => {
  const clock = mock.clock(on, { now: 1000 * MINUTE })
  const seen = world(on)

  await $.session.start(START)
  await $.command.run(focus('30'))
  expect((await $.command.run(focus('5'))).text).toBe('5 min focus block started.')

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: / of 5/ })).toBeDefined()
  await ui.unmount()

  await clock.advance(6 * MINUTE)
  expect(seen.toasts).toEqual(['Focus block finished. Time for a break.'])

  await clock.advance(30 * MINUTE)
  expect(seen.toasts).toHaveLength(1)
})

test('accepts STOP in any case and decimal minutes', async ($, on) => {
  mock.clock(on, { now: 1000 * MINUTE })
  world(on)

  await $.session.start(START)
  expect((await $.command.run(focus('1.5'))).text).toBe('1.5 min focus block started.')
  expect((await $.command.run(focus('  STOP '))).text).toBe('Focus block cancelled.')
  expect((await $.command.run(focus('240'))).text).toBe('240 min focus block started.')
  await $.command.run(focus('stop'))
})

test('still toasts when the desktop notification fails', async ($, on) => {
  const clock = mock.clock(on, { now: 1000 * MINUTE })
  const toasts: string[] = []
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('command.register', (_$, e) => ({ value: { command: e.name } }))
  on('ui.toast', (_$, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })
  on('ui.notify', () => {
    throw new Error('no notifier')
  })

  await $.session.start(START)
  await $.command.run(focus('1'))
  await clock.advance(2 * MINUTE)
  expect(toasts).toEqual(['Focus block finished. Time for a break.'])
})

test('speaks Spanish when the hub is set to es', async ($, on) => {
  const clock = mock.clock(on, { now: 1000 * MINUTE })
  const seen = world(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  await $.session.start(START)
  expect((await $.command.run(focus('nunca'))).text).toBe('Uso: /focus [minutos de 1 a 240 | stop]')
  expect((await $.command.run(focus('1'))).text).toBe('Bloque de foco de 1 min iniciado.')
  await clock.advance(2 * MINUTE)
  expect(seen.toasts).toEqual(['Bloque de foco terminado. Hora de descansar.'])
})
