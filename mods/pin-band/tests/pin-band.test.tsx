import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'

const START = { cwd: '/project', surface: 'terminal', isInteractive: true } as const

const BAND = {
  plugin: 'pin-band',
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

const pin = (args: string) =>
  ({
    command: 'pin',
    args,
    origin: { kind: 'composer' },
    presentation: { isFullscreen: true, columns: 120 },
  }) as const

// The world beneath the mod: the session and the command, and the empty box the engine would draw.
const world = (on: On) => {
  mock.store(on)
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('session.root', () => ({ value: '/project' }))
  on('command.register', (_$, e) => ({ value: { command: e.name } }))
  on('ui.render', { component: 'AbovePrompt' }, ($, e) => {
    const { Box } = $.ui.resolve(e)

    return <Box />
  })
}

test('pins reminders above the prompt, one row each', async ($, on) => {
  world(on)

  await $.session.start(START)
  expect((await $.command.run(pin('run the migration'))).text).toBe('Reminder 1 pinned.')
  expect((await $.command.run(pin('ask Ana about the API'))).text).toBe('Reminder 2 pinned.')

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })

    expect(await ui.find({ type: 'Text', text: /REMINDER/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /run the migration/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /ask Ana about the API/ })).toBeDefined()
    await ui.unmount()
  }
})

test('removes one reminder by number, or all of them', async ($, on) => {
  world(on)

  await $.session.start(START)
  await $.command.run(pin('first'))
  await $.command.run(pin('second'))

  expect((await $.command.run(pin('rm 1'))).text).toBe('Reminder 1 removed.')
  expect((await $.command.run(pin('rm 9'))).text).toBe('No such reminder: 9')

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /first/ })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: /second/ })).toBeDefined()
  await ui.unmount()

  expect((await $.command.run(pin('clear'))).text).toBe('Reminders removed.')
  const after = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await after.find({ type: 'Text', text: /REMINDER/ })).toBeUndefined()
  await after.unmount()
})

test('holds four reminders at most, and shows the usage with no text', async ($, on) => {
  world(on)

  await $.session.start(START)
  expect((await $.command.run(pin(''))).text).toContain('Usage')

  for (const n of [1, 2, 3, 4]) {
    await $.command.run(pin(`note ${n}`))
  }

  expect((await $.command.run(pin('note 5'))).text).toBe('Limit of 4 reminders. Remove one with /pin rm <n>.')
})

test('takes up the reminders kept in the store', async ($, on) => {
  mock.store(on, { 'pins:/project': ['water the plants', 7, 'call back'] })
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('session.root', () => ({ value: '/project' }))
  on('command.register', (_$, e) => ({ value: { command: e.name } }))
  on('ui.render', { component: 'AbovePrompt' }, ($, e) => {
    const { Box } = $.ui.resolve(e)

    return <Box />
  })

  await $.session.start(START)
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /water the plants/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /call back/ })).toBeDefined()
  await ui.unmount()
})

test('hides while the hub lists it as off', async ($, on) => {
  world(on)
  on('state.get', { plugin: 'cockpit', key: 'off' }, () => ({ value: { value: ['pin-band'], version: 1 } }))

  await $.session.start(START)
  await $.command.run(pin('hidden note'))

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /hidden note/ })).toBeUndefined()
  await ui.unmount()
})

test('speaks the language set in the hub', async ($, on) => {
  world(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  await $.session.start(START)
  expect((await $.command.run(pin('ligar para a Ana'))).text).toBe('Lembrete 1 fixado.')

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /LEMBRETE/ })).toBeDefined()
  await ui.unmount()
})
