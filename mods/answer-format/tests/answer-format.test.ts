import { expect, mock, test } from 'claude-code/testing'

const COMPOSE = { model: 'claude-test', promptModel: 'claude-test', surfaces: ['terminal'], tools: [], outputStyle: null, traits: [] } as const

const run = (args: string) => ({
  command: 'format',
  args,
  origin: { kind: 'composer' } as const,
  presentation: { isFullscreen: true, columns: 120 },
})

test('keeps the chosen shape and asks for it in a section', async ($, on) => {
  mock.store(on)
  on('prompt.compose', () => ({ sections: [] }))

  const none = await $.prompt.compose(COMPOSE)
  expect(none.sections).toEqual([])

  const set = await $.command.run(run('table'))
  expect(set.text).toContain('table')

  const composed = await $.prompt.compose(COMPOSE)
  expect(composed.sections.find(s => s.id === 'answer-format:shape')?.text).toContain('Markdown table')

  await $.command.run(run('off'))
  expect((await $.prompt.compose(COMPOSE)).sections).toEqual([])
})

test('rejects an unknown shape', async ($, on) => {
  mock.store(on)

  const answer = await $.command.run(run('poem'))
  expect(answer.text).toContain('Unknown format: poem')
})

test('speaks the language set in the hub', async ($, on) => {
  mock.store(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  const answer = await $.command.run(run('steps'))
  expect(answer.text).toContain('Formato das respostas definido como steps')
})

const START = { cwd: '/project', surface: 'terminal', isInteractive: true } as const

test('says which shape is set, and none when nothing is', async ($, on) => {
  mock.store(on)

  expect((await $.command.run(run(''))).text).toBe('No answer format set. Use /format bullets|steps|table|prose.')
  await $.command.run(run('BULLETS'))
  expect((await $.command.run(run(''))).text).toBe('Answer format: bullets. Use /format off to clear it.')
  expect((await $.command.run(run('off'))).text).toBe('Answer format cleared.')
})

test('shows the shape in the status line and clears it with off', async ($, on) => {
  mock.store(on)
  const shown: (string | undefined)[] = []
  on('ui.status', (_$, e) => {
    shown.push(e.text)

    return { value: undefined }
  })

  await $.command.run(run('prose'))
  await $.command.run(run('off'))
  expect(shown).toEqual(['format prose', undefined])
})

test('puts the kept shape back in the status line when a session starts', async ($, on) => {
  mock.store(on, { mode: 'steps' })
  const shown: (string | undefined)[] = []
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('command.register', (_$, e) => ({ value: { command: e.name } }))
  on('ui.status', (_$, e) => {
    shown.push(e.text)

    return { value: undefined }
  })
  on('prompt.compose', () => ({ sections: [] }))

  await $.session.start(START)
  expect(shown).toEqual(['format steps'])
  expect((await $.prompt.compose(COMPOSE)).sections[0]?.text).toBe(
    '# Answer format\nAnswer as a numbered list of steps in the order to perform them, one action per step.',
  )
})

test('ignores a stored value that is not a known shape', async ($, on) => {
  mock.store(on, { mode: 'poem' })
  on('prompt.compose', () => ({ sections: [] }))

  expect((await $.prompt.compose(COMPOSE)).sections).toEqual([])
  expect((await $.command.run(run(''))).text).toContain('No answer format set')
})

test('speaks Spanish, and Portuguese in the status line', async ($, on) => {
  mock.store(on)
  let lang = 'es'
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: lang, version: 1 } }))
  const shown: (string | undefined)[] = []
  on('ui.status', (_$, e) => {
    shown.push(e.text)

    return { value: undefined }
  })

  expect((await $.command.run(run(''))).text).toBe('No hay formato definido. Usa /format bullets|steps|table|prose.')
  expect((await $.command.run(run('table'))).text).toBe('Formato de respuestas definido en table (vale desde el próximo prompt).')
  expect((await $.command.run(run('poema'))).text).toBe('Formato desconocido: poema. Usa bullets, steps, table, prose u off.')
  expect((await $.command.run(run('off'))).text).toBe('Formato de respuestas quitado.')

  lang = 'pt'
  await $.command.run(run('bullets'))
  expect(shown).toEqual(['formato table', undefined, 'formato bullets'])
  expect((await $.command.run(run(''))).text).toBe('Formato das respostas: bullets. Use /format off para limpar.')
})
