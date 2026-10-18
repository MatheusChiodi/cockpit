import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'

const START = { cwd: '/project', surface: 'terminal', isInteractive: true } as const
const MINUTE = 60000

const BAND = {
  plugin: 'deadline-band',
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

const deadline = (args: string) =>
  ({
    command: 'deadline',
    args,
    origin: { kind: 'composer' },
    presentation: { isFullscreen: true, columns: 120 },
  }) as const

// Local time on 2026-10-13, whatever the machine's zone.
const at = (hours: number, minutes = 0): number => new Date(2026, 9, 13, hours, minutes).getTime()

// The world beneath the mod: the session and the command, and the empty box the engine would draw.
const world = (on: On) => {
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('session.root', () => ({ value: '/project' }))
  on('command.register', (_$, e) => ({ value: { command: e.name } }))
  on('ui.render', { component: 'AbovePrompt' }, ($, e) => {
    const { Box } = $.ui.resolve(e)

    return <Box />
  })
}

test('counts down to the deadline with its description and date', async ($, on) => {
  mock.store(on)
  const clock = mock.clock(on, { now: at(12) })
  world(on)

  await $.session.start(START)
  expect((await $.command.run(deadline('2026-10-14 18:00 ship v2'))).text).toContain('Deadline "ship v2" set for')

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })

    expect(await ui.find({ type: 'Text', text: /DEADLINE/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /in 1d 6h/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /ship v2/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /10\/14/ })).toBeDefined()
    await ui.unmount()
  }

  await clock.advance(25 * 60 * MINUTE)
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /in 5h 0?0?min|in 5h/ })).toBeDefined()
  await ui.unmount()
})

test('shows how late it is once the deadline has passed', async ($, on) => {
  mock.store(on)
  const clock = mock.clock(on, { now: at(12) })
  world(on)

  await $.session.start(START)
  await $.command.run(deadline('2026-10-13 13:00'))
  await clock.advance(3 * 60 * MINUTE)

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /overdue 2h 0min/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /deadline  /u })).toBeDefined()
  await ui.unmount()
})

test('takes up the deadline kept in the store, and clear removes it', async ($, on) => {
  mock.store(on, { 'deadline:/project': { at: at(15), label: 'demo' } })
  mock.clock(on, { now: at(12) })
  world(on)

  await $.session.start(START)
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /in 3h 0min/ })).toBeDefined()
  await ui.unmount()

  expect((await $.command.run(deadline('clear'))).text).toBe('Deadline removed.')
  const after = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await after.find({ type: 'Text', text: /DEADLINE/ })).toBeUndefined()
  await after.unmount()
})

test('draws nothing with no deadline, and shows the usage for a bad date', async ($, on) => {
  mock.store(on)
  mock.clock(on, { now: at(12) })
  world(on)

  await $.session.start(START)
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /DEADLINE/ })).toBeUndefined()
  await ui.unmount()

  expect((await $.command.run(deadline('tomorrow'))).text).toContain('Usage')
  expect((await $.command.run(deadline(''))).text).toContain('Usage')
})

test('hides while the hub lists it as off', async ($, on) => {
  mock.store(on, { 'deadline:/project': { at: at(15), label: 'demo' } })
  mock.clock(on, { now: at(12) })
  world(on)
  on('state.get', { plugin: 'cockpit', key: 'off' }, () => ({ value: { value: ['deadline-band'], version: 1 } }))

  await $.session.start(START)
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /DEADLINE/ })).toBeUndefined()
  await ui.unmount()
})

test('speaks the language set in the hub', async ($, on) => {
  mock.store(on, { 'deadline:/project': { at: at(15), label: '' } })
  mock.clock(on, { now: at(12) })
  world(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  await $.session.start(START)
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /PRAZO/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /em 3h 0min/ })).toBeDefined()
  await ui.unmount()

  expect((await $.command.run(deadline('clear'))).text).toBe('Prazo removido.')
})

test('a deadline without a time falls at 18:00', async ($, on) => {
  mock.store(on)
  mock.clock(on, { now: at(12) })
  world(on)

  await $.session.start(START)
  await $.command.run(deadline('2026-10-13'))

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /in 6h 0min/ })).toBeDefined()
  await ui.unmount()
})

test('counts in minutes under an hour and in days past one', async ($, on) => {
  mock.store(on)
  mock.clock(on, { now: at(12) })
  world(on)

  await $.session.start(START)
  await $.command.run(deadline('2026-10-13 12:45 standup'))
  const soon = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await soon.find({ type: 'Text', text: /in 45min/ })).toBeDefined()
  await soon.unmount()

  await $.command.run(deadline('2026-10-16 15:00 launch'))
  const later = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await later.find({ type: 'Text', text: /in 3d 3h/ })).toBeDefined()
  expect(await later.find({ type: 'Text', text: /launch/ })).toBeDefined()
  await later.unmount()
})

test('cuts a long description to 60 characters', async ($, on) => {
  mock.store(on)
  mock.clock(on, { now: at(12) })
  world(on)

  await $.session.start(START)
  const answer = await $.command.run(deadline(`2026-10-14 ${'x'.repeat(80)}`))
  expect(answer.text).toContain(`"${'x'.repeat(60)}"`)
  expect(answer.text).not.toContain('x'.repeat(61))
})

test('keeps the band of the mods beneath', async ($, on) => {
  mock.store(on, { 'deadline:/project': { at: at(15), label: 'demo' } })
  mock.clock(on, { now: at(12) })
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('session.root', () => ({ value: '/project' }))
  on('command.register', (_$, e) => ({ value: { command: e.name } }))
  on('ui.render', { component: 'AbovePrompt' }, ($, e) => {
    const { Text } = $.ui.resolve(e)

    return <Text>beneath</Text>
  })

  await $.session.start(START)
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /beneath/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /DEADLINE/ })).toBeDefined()
  await ui.unmount()
})

test('speaks Spanish when the hub says so', async ($, on) => {
  mock.store(on, { 'deadline:/project': { at: at(11), label: '' } })
  mock.clock(on, { now: at(12) })
  world(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  await $.session.start(START)
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /PLAZO/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /vencido hace 1h 0min/ })).toBeDefined()
  await ui.unmount()

  expect((await $.command.run(deadline('nope'))).text).toContain('Uso: /deadline')
})
