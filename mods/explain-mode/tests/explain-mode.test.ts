import { expect, mock, test } from 'claude-code/testing'

const run = (args: string) => ({
  command: 'explain',
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

  expect(await ids()).not.toContain('explain-mode:rule')

  const turnedOn = await $.command.run(run('on'))
  expect(turnedOn.text).toContain('on')
  expect(await ids()).toContain('explain-mode:rule')

  await $.command.run(run('off'))
  expect(await ids()).not.toContain('explain-mode:rule')
})

test('toggles with no argument', async ($, on) => {
  mock.store(on)
  on('ui.status', () => ({ value: undefined }))
  on('prompt.compose', () => ({ sections: [] }))
  const ids = async () => (await $.prompt.compose(FACTS)).sections.map(section => section.id)

  await $.command.run(run(''))
  expect(await ids()).toContain('explain-mode:rule')

  await $.command.run(run(''))
  expect(await ids()).not.toContain('explain-mode:rule')
})

test('answers in the hub language', async ($, on) => {
  mock.store(on)
  on('ui.status', () => ({ value: undefined }))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  const answer = await $.command.run(run('on'))
  expect(answer.text).toContain('ligado')
})

const START = { cwd: '/project', surface: 'terminal', isInteractive: true } as const

test('registers /explain at start and shows the status when it was left on', async ($, on) => {
  mock.store(on, { isOn: true })
  const registered: { name: string; description: string; argumentHint?: string }[] = []
  const status: (string | undefined)[] = []
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('command.register', (_$, e) => {
    registered.push({ name: e.name, description: e.description, argumentHint: e.argumentHint })

    return { value: { command: e.name } }
  })
  on('ui.status', (_$, e) => {
    status.push(e.text)

    return { value: undefined }
  })

  await $.session.start(START)

  expect(registered).toEqual([
    { name: 'explain', description: 'Turns on or off a short explanation of each change', argumentHint: '[on|off]' },
  ])
  expect(status).toEqual(['explain'])
})

test('shows no status at start while it is off', async ($, on) => {
  mock.store(on)
  const status: (string | undefined)[] = []
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('command.register', (_$, e) => ({ value: { command: e.name } }))
  on('ui.status', (_$, e) => {
    status.push(e.text)

    return { value: undefined }
  })

  await $.session.start(START)
  expect(status).toEqual([])
})

test('sets and clears the status line as it switches, in English', async ($, on) => {
  mock.store(on)
  const status: (string | undefined)[] = []
  on('ui.status', (_$, e) => {
    status.push(e.text)

    return { value: undefined }
  })

  const turnedOn = await $.command.run(run(' ON '))
  const turnedOff = await $.command.run(run('off'))

  expect(turnedOn.text).toBe('Explain mode on (applies from the next prompt).')
  expect(turnedOff.text).toBe('Explain mode off (applies from the next prompt).')
  expect(status).toEqual(['explain', undefined])
})

test('an unknown argument toggles like no argument', async ($, on) => {
  mock.store(on, { isOn: true })
  on('ui.status', () => ({ value: undefined }))

  const answer = await $.command.run(run('maybe'))
  expect(answer.text).toBe('Explain mode off (applies from the next prompt).')
})

test('keeps the sections beneath and appends its own', async ($, on) => {
  mock.store(on, { isOn: true })
  on('prompt.compose', () => ({ sections: [{ id: 'other:rule', text: 'x', scope: 'session' as const }] }))

  const composed = await $.prompt.compose(FACTS)
  expect(composed.sections.map(section => section.id)).toEqual(['other:rule', 'explain-mode:rule'])
})

test('answers in Spanish and Portuguese when the hub asks', async ($, on) => {
  mock.store(on)
  on('ui.status', () => ({ value: undefined }))
  let lang = 'es'
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: lang, version: 1 } }) as never)

  expect((await $.command.run(run('on'))).text).toBe('Modo explicar activado (vale desde el próximo prompt).')

  lang = 'pt'
  expect((await $.command.run(run('off'))).text).toBe('Modo explicar desligado (vale a partir do próximo prompt).')
})
