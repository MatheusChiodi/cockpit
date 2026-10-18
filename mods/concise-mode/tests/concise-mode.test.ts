import { expect, mock, test } from 'claude-code/testing'

const run = (args: string) => ({
  command: 'concise',
  args,
  origin: { kind: 'composer' } as const,
  presentation: { isFullscreen: true, columns: 120 },
})

const INPUT = {
  model: 'claude-test',
  promptModel: 'claude-test',
  surfaces: ['terminal'],
  tools: [],
  outputStyle: null,
  traits: [],
} as const

const PT = { value: { value: 'pt', version: 1 } } as const

test('toggles on and off, adds the style section and shows the status entry', async ($, on) => {
  mock.store(on)
  const statuses: (string | undefined)[] = []
  on('ui.status', ($, e) => {
    statuses.push(e.text)

    return { value: undefined }
  })
  on('prompt.compose', () => ({ sections: [] }))

  expect((await $.prompt.compose(INPUT)).sections).toHaveLength(0)

  const turnedOn = await $.command.run(run(''))
  expect(turnedOn.text).toContain('Concise mode on')
  expect((await $.prompt.compose(INPUT)).sections.map(section => section.id)).toEqual(['concise-mode:style'])

  const turnedOff = await $.command.run(run(''))
  expect(turnedOff.text).toContain('Concise mode off')
  expect((await $.prompt.compose(INPUT)).sections).toHaveLength(0)
  expect(statuses).toEqual(['concise', undefined])
})

test('on and off are explicit and idempotent', async ($, on) => {
  mock.store(on)
  on('ui.status', () => ({ value: undefined }))
  on('prompt.compose', () => ({ sections: [] }))

  await $.command.run(run('on'))
  const again = await $.command.run(run('ON'))
  expect(again.text).toContain('Concise mode on')
  expect((await $.prompt.compose(INPUT)).sections).toHaveLength(1)

  await $.command.run(run('off'))
  expect((await $.prompt.compose(INPUT)).sections).toHaveLength(0)
})

test('speaks the language set in the hub', async ($, on) => {
  mock.store(on)
  on('ui.status', () => ({ value: undefined }))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => PT)

  const answer = await $.command.run(run('on'))
  expect(answer.text).toContain('Modo conciso ligado')
})

const START = { cwd: '/project', surface: 'terminal', isInteractive: true } as const

// The session beneath the mod; returns the status entries and the commands registered.
const session = (on: any) => {
  const statuses: (string | undefined)[] = []
  const commands: string[] = []
  on('session.start', (_: unknown, e: { cwd: string }) => ({ cwd: e.cwd }))
  on('command.register', (_: unknown, e: { name: string; description?: string }) => {
    commands.push(`${e.name}: ${e.description}`)

    return { value: { command: e.name } }
  })
  on('ui.status', (_: unknown, e: { text: string | undefined }) => {
    statuses.push(e.text)

    return { value: undefined }
  })

  return { statuses, commands }
}

test('shows the status entry at start when concise mode was left on', async ($, on) => {
  mock.store(on, { isOn: true })
  const { statuses, commands } = session(on)

  await $.session.start(START)

  expect(statuses).toEqual(['concise'])
  expect(commands).toEqual(['concise: Turns concise mode on or off (short, direct answers)'])
})

test('shows nothing at start when concise mode is off', async ($, on) => {
  mock.store(on, { isOn: false })
  const { statuses } = session(on)

  await $.session.start(START)

  expect(statuses).toEqual([])
})

test('keeps what was composed beneath and adds the section after it', async ($, on) => {
  mock.store(on, { isOn: true })
  on('prompt.compose', () => ({ sections: [{ id: 'other', text: 'kept', scope: 'session' as const }] }))

  const sections = (await $.prompt.compose(INPUT)).sections
  expect(sections.map(section => section.id)).toEqual(['other', 'concise-mode:style'])
  expect(sections[1]?.text).toContain('# Concise mode')
})

test('an unknown argument toggles like no argument', async ($, on) => {
  mock.store(on, { isOn: true })
  on('ui.status', () => ({ value: undefined }))

  expect((await $.command.run(run('maybe'))).text).toBe('Concise mode off (applies from the next prompt).')
})

test('speaks Spanish and Portuguese at start and in the command', async ($, on) => {
  mock.store(on, { isOn: true })
  const lang = { value: 'es' }
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: lang.value as 'es', version: 1 } }))
  const { statuses, commands } = session(on)

  await $.session.start(START)
  expect(statuses).toEqual(['conciso'])
  expect(commands).toEqual(['concise: Activa/desactiva el modo conciso (respuestas cortas y directas)'])
  expect((await $.command.run(run('off'))).text).toBe('Modo conciso desactivado (vale desde el próximo prompt).')

  lang.value = 'pt'
  expect((await $.command.run(run('off'))).text).toBe('Modo conciso desligado (vale a partir do próximo prompt).')
})
