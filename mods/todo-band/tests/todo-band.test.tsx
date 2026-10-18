import { expect, mock, test } from 'claude-code/testing'

const BAND = {
  plugin: 'todo-band',
  component: 'AbovePrompt',
  props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 100, scroll: { offset: 0, bodyRows: 10 }, view: {} },
  viewport: { columns: 120, rows: 40 },
} as const

const START = { cwd: '/repo', surface: null, isInteractive: true } as const

const done = (exitCode: number, stdout = '') => ({
  value: { exitCode, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false },
})

// The hub's switch and language, plus the empty box the engine would draw with no mod.
const hub = (on: any, off: string[] = [], lang = 'en') => {
  on('session.start', (_: unknown, e: any) => ({ cwd: e.cwd }))
  on('state.get', { plugin: 'cockpit', key: 'off' }, () => ({ value: { value: off, version: 1 } }))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: lang, version: 1 } }))
  on('ui.render', { component: 'AbovePrompt' }, ($: any, e: any) => {
    const { Box } = $.ui.resolve(e)

    return <Box />
  })
}

const has = async (ui: any, text: RegExp) => (await ui.find({ type: 'Text', text })) !== undefined

const draw = async ($: any, surface: 'terminal' | 'desktop' = 'terminal') => {
  await $.session.start(START)

  return $.ui.mount({ ...BAND, surface })
}

const todo = (args: string) =>
  ({
    command: 'todo',
    args,
    origin: { kind: 'composer' },
    presentation: { isFullscreen: false, columns: 80 },
  }) as const

const world = (on: any, held?: unknown, off: string[] = [], lang = 'en') => {
  mock.store(on, held === undefined ? {} : { 'todos:/work': held })
  hub(on, off, lang)
  on('session.root', () => ({ value: '/work' }))
  on('command.register', (_: unknown, e: { name: string }) => ({ value: { command: e.name } }))
}

test('adds, completes and removes tasks, and draws the progress', async ($, on) => {
  world(on)
  await $.session.start(START)

  expect((await $.command.run(todo('write tests'))).text).toBe('Task 1 added.')
  expect((await $.command.run(todo('ship it'))).text).toBe('Task 2 added.')
  expect((await $.command.run(todo('done 1'))).text).toBe('Task 1 completed.')

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })

    expect(await has(ui, /TODOS/)).toBe(true)
    expect(await has(ui, /1\/2/)).toBe(true)
    expect(await has(ui, /write tests/)).toBe(true)
    expect(await has(ui, /ship it/)).toBe(true)
    await ui.unmount()
  }

  expect((await $.command.run(todo('done 1'))).text).toBe('Task 1 reopened.')
  expect((await $.command.run(todo('rm 2'))).text).toBe('Task 2 removed.')
  expect(await has(await $.ui.mount({ ...BAND, surface: 'terminal' }), /0\/1/)).toBe(true)
})

test('clear removes the completed tasks only', async ($, on) => {
  world(on)
  await $.session.start(START)
  await $.command.run(todo('one'))
  await $.command.run(todo('two'))
  await $.command.run(todo('done 1'))

  expect((await $.command.run(todo('clear'))).text).toBe('Completed tasks removed.')

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await has(ui, /0\/1/)).toBe(true)
  expect(await has(ui, /two/)).toBe(true)
  expect(await has(ui, /one/)).toBe(false)
})

test('answers with usage and with a missing task', async ($, on) => {
  world(on)
  await $.session.start(START)

  expect((await $.command.run(todo(''))).text).toContain('Usage: /todo')
  expect((await $.command.run(todo('done 3'))).text).toBe('No such task: 3')
  expect((await $.command.run(todo('rm 3'))).text).toBe('No such task: 3')
})

test('restores the list of the project and shows pending tasks first, five at most', async ($, on) => {
  const held = [
    { id: 'd', text: 'finished one', isDone: true },
    ...Array.from({ length: 6 }, (_, i) => ({ id: `p${i}`, text: `pending ${i}`, isDone: false })),
  ]
  world(on, held)
  await $.session.start(START)

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await has(ui, /1\/7/)).toBe(true)
  expect(await has(ui, /\+2 hidden/)).toBe(true)
  expect(await has(ui, /pending 4/)).toBe(true)
  expect(await has(ui, /pending 5/)).toBe(false)
  expect(await has(ui, /finished one/)).toBe(false)
})

test('a button press toggles a task', async ($, on) => {
  world(on, [{ id: 'x1', text: 'press me', isDone: false }])
  await $.session.start(START)

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await has(ui, /0\/1/)).toBe(true)
  await ui.press({ key: 'todo:x1' })
  expect(await has(ui, /1\/1/)).toBe(true)
  await ui.unmount()
})

test('draws nothing without tasks', async ($, on) => {
  world(on)
  expect(await has(await draw($), /TODOS/)).toBe(false)
})

test('hides while the hub lists it as off', async ($, on) => {
  world(on, [{ id: 'x1', text: 'hidden', isDone: false }], ['todo-band'])
  expect(await has(await draw($), /TODOS/)).toBe(false)
})

test('speaks the language set in the hub', async ($, on) => {
  world(on, undefined, [], 'pt')
  await $.session.start(START)

  expect((await $.command.run(todo('escrever testes'))).text).toBe('Tarefa 1 adicionada.')
  expect((await $.command.run(todo('done 1'))).text).toBe('Tarefa 1 concluída.')
  expect(await has(await $.ui.mount({ ...BAND, surface: 'terminal' }), /TAREFAS/)).toBe(true)
})

test('speaks Spanish when the hub is set to es', async ($, on) => {
  world(on, undefined, [], 'es')
  await $.session.start(START)

  expect((await $.command.run(todo('escribir pruebas'))).text).toBe('Tarea 1 añadida.')
  expect((await $.command.run(todo('done 1'))).text).toBe('Tarea 1 completada.')
  expect((await $.command.run(todo('done 1'))).text).toBe('Tarea 1 reabierta.')
  expect((await $.command.run(todo('rm 9'))).text).toBe('La tarea no existe: 9')
  expect((await $.command.run(todo(''))).text).toContain('Uso: /todo')
  expect(await has(await $.ui.mount({ ...BAND, surface: 'terminal' }), /TAREAS/)).toBe(true)
})

test('answers in Portuguese for usage, missing, removal and clear', async ($, on) => {
  world(on, undefined, [], 'pt')
  await $.session.start(START)

  expect((await $.command.run(todo(''))).text).toContain('Uso: /todo')
  expect((await $.command.run(todo('rm 4'))).text).toBe('Tarefa inexistente: 4')
  await $.command.run(todo('a'))
  expect((await $.command.run(todo('rm 1'))).text).toBe('Tarefa 1 removida.')
  expect((await $.command.run(todo('clear'))).text).toBe('Tarefas concluídas removidas.')
})

test('a non-numeric index is a missing task', async ($, on) => {
  world(on)
  await $.session.start(START)
  await $.command.run(todo('one'))

  expect((await $.command.run(todo('done abc'))).text).toBe('No such task: abc')
  expect((await $.command.run(todo('rm 0'))).text).toBe('No such task: 0')
})

test('a bare "done" is added as a task of its own', async ($, on) => {
  world(on)
  await $.session.start(START)

  expect((await $.command.run(todo('done'))).text).toBe('Task 1 added.')
  expect(await has(await $.ui.mount({ ...BAND, surface: 'terminal' }), /done/)).toBe(true)
})

test('cuts a task text at 120 characters', async ($, on) => {
  world(on)
  await $.session.start(START)
  await $.command.run(todo(`${'a'.repeat(120)}TAIL`))

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await has(ui, new RegExp(`a{120}`))).toBe(true)
  expect(await has(ui, /TAIL/)).toBe(false)
})

test('ignores a stored value that is not a list', async ($, on) => {
  world(on, { not: 'a list' })
  expect(await has(await draw($), /TODOS/)).toBe(false)
})

test('hides while a survey is shown', async ($, on) => {
  world(on, [{ id: 'x1', text: 'pending', isDone: false }])
  await $.session.start(START)

  const ui = await $.ui.mount({ ...BAND, props: { ...BAND.props, hasSurvey: true }, surface: 'terminal' })
  expect(await has(ui, /TODOS/)).toBe(false)
})

test('the list survives a new session of the same project', async ($, on) => {
  world(on)
  await $.session.start(START)
  await $.command.run(todo('keep me'))
  await $.session.start(START)

  expect(await has(await $.ui.mount({ ...BAND, surface: 'terminal' }), /keep me/)).toBe(true)
})
