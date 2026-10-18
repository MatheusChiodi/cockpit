import { expect, mock, test } from 'claude-code/testing'

const run = (args: string) => ({
  command: 'tdd',
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

  expect(await ids()).not.toContain('test-first:rule')

  const turnedOn = await $.command.run(run('on'))
  expect(turnedOn.text).toContain('on')
  expect(await ids()).toContain('test-first:rule')

  await $.command.run(run('off'))
  expect(await ids()).not.toContain('test-first:rule')
})

test('toggles with no argument', async ($, on) => {
  mock.store(on)
  on('ui.status', () => ({ value: undefined }))
  on('prompt.compose', () => ({ sections: [] }))
  const ids = async () => (await $.prompt.compose(FACTS)).sections.map(section => section.id)

  await $.command.run(run(''))
  expect(await ids()).toContain('test-first:rule')

  await $.command.run(run(''))
  expect(await ids()).not.toContain('test-first:rule')
})

test('answers in the hub language', async ($, on) => {
  mock.store(on)
  on('ui.status', () => ({ value: undefined }))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  const answer = await $.command.run(run('on'))
  expect(answer.text).toContain('ligado')
})

test('answers in Spanish and Portuguese for both states', async ($, on) => {
  mock.store(on)
  on('ui.status', () => ({ value: undefined }))
  let lang = 'es'
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: lang, version: 1 } }))

  expect((await $.command.run(run('on'))).text).toBe('Modo test-first activado (vale desde el próximo prompt).')
  expect((await $.command.run(run('off'))).text).toBe('Modo test-first desactivado (vale desde el próximo prompt).')

  lang = 'pt'
  expect((await $.command.run(run('off'))).text).toBe('Modo test-first desligado (vale a partir do próximo prompt).')
})

test('shows the status entry while on and clears it when off', async ($, on) => {
  mock.store(on)
  const status: (string | undefined)[] = []
  on('ui.status', (_: unknown, e: { text: string | undefined }) => {
    status.push(e.text)

    return { value: undefined }
  })

  await $.command.run(run('ON'))
  expect(status.at(-1)).toBe('tdd')

  await $.command.run(run('  Off  '))
  expect(status.at(-1)).toBeUndefined()
})

test('a stored on survives into a new session', async ($, on) => {
  mock.store(on, { isOn: true })
  const status: (string | undefined)[] = []
  on('session.start', (_: unknown, e: any) => ({ cwd: e.cwd }))
  on('command.register', (_: unknown, e: { name: string }) => ({ value: { command: e.name } }))
  on('ui.status', (_: unknown, e: { text: string | undefined }) => {
    status.push(e.text)

    return { value: undefined }
  })
  on('prompt.compose', () => ({ sections: [] }))

  await $.session.start({ cwd: '/work', surface: null, isInteractive: true })
  expect(status).toEqual(['tdd'])
  expect((await $.prompt.compose(FACTS)).sections.map(section => section.id)).toContain('test-first:rule')
})

test('the section is in English and keeps the sections beneath it', async ($, on) => {
  mock.store(on, { isOn: true })
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))
  on('prompt.compose', () => ({ sections: [{ id: 'base', text: 'kept', scope: 'session' as const }] }))

  const sections = (await $.prompt.compose(FACTS)).sections
  expect(sections.map(section => section.id)).toEqual(['base', 'test-first:rule'])
  expect(sections[1]?.text).toContain('Write a failing test before the implementation.')
})
