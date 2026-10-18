import { expect, mock, test } from 'claude-code/testing'

const run = (args: string) => ({
  command: 'plan-first',
  args,
  origin: { kind: 'composer' } as const,
  presentation: { isFullscreen: false, columns: 100 },
})

const FACTS = { model: 'm', promptModel: 'm', surfaces: [], tools: [], outputStyle: null, traits: [] }

test('adds the section only while on', async ($, on) => {
  mock.store(on)
  on('ui.status', () => ({ value: undefined }))
  on('prompt.compose', () => ({ sections: [] }))
  const ids = async () => (await $.prompt.compose(FACTS)).sections.map(section => section.id)

  expect(await ids()).not.toContain('plan-first:rule')

  const turnedOn = await $.command.run(run('on'))
  expect(turnedOn.text).toContain('on')
  expect(await ids()).toContain('plan-first:rule')

  await $.command.run(run('off'))
  expect(await ids()).not.toContain('plan-first:rule')
})

test('toggles with no argument', async ($, on) => {
  mock.store(on)
  on('ui.status', () => ({ value: undefined }))
  on('prompt.compose', () => ({ sections: [] }))
  const ids = async () => (await $.prompt.compose(FACTS)).sections.map(section => section.id)

  await $.command.run(run(''))
  expect(await ids()).toContain('plan-first:rule')

  await $.command.run(run(''))
  expect(await ids()).not.toContain('plan-first:rule')
})

test('answers in the hub language', async ($, on) => {
  mock.store(on)
  on('ui.status', () => ({ value: undefined }))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  const answer = await $.command.run(run('on'))
  expect(answer.text).toContain('ligado')
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

test('shows the status entry at start only when the mode was left on', async ($, on) => {
  mock.store(on, { isOn: true })
  const { statuses, commands } = session(on)

  await $.session.start(START)

  expect(statuses).toEqual(['plan'])
  expect(commands).toEqual(['plan-first: Turns on or off a file list and order before multi-file edits'])
})

test('shows nothing at start when the mode was never turned on', async ($, on) => {
  mock.store(on)
  const { statuses } = session(on)

  await $.session.start(START)

  expect(statuses).toEqual([])
})

test('writes and clears the status entry as it switches, case aside', async ($, on) => {
  mock.store(on)
  const { statuses } = session(on)

  expect((await $.command.run(run('ON'))).text).toBe('Plan-first mode on (applies from the next prompt).')
  expect((await $.command.run(run(' Off '))).text).toBe('Plan-first mode off (applies from the next prompt).')
  expect(statuses).toEqual(['plan', undefined])
})

test('keeps what was composed beneath and adds the rule after it', async ($, on) => {
  mock.store(on, { isOn: true })
  on('prompt.compose', () => ({ sections: [{ id: 'other', text: 'kept', scope: 'session' as const }] }))

  const sections = (await $.prompt.compose(FACTS)).sections
  expect(sections.map(section => section.id)).toEqual(['other', 'plan-first:rule'])
  expect(sections[1]?.text).toContain('list the files you will touch')
})

test('speaks Spanish when the hub is set to es', async ($, on) => {
  mock.store(on, { isOn: true })
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))
  const { statuses, commands } = session(on)

  await $.session.start(START)
  expect(statuses).toEqual(['plan'])
  expect(commands).toEqual(['plan-first: Activa o desactiva la lista de archivos y orden antes de editar varios archivos'])
  expect((await $.command.run(run(''))).text).toBe('Modo plan primero desactivado (vale desde el próximo prompt).')
})

test('shows the Portuguese status entry', async ($, on) => {
  mock.store(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))
  const { statuses } = session(on)

  expect((await $.command.run(run('on'))).text).toBe('Modo plano primeiro ligado (vale a partir do próximo prompt).')
  expect(statuses).toEqual(['plano'])
})
