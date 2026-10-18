import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'

const PT = { value: { value: 'pt', version: 1 } } as const
const ES = { value: { value: 'es', version: 1 } } as const

const run = (command: string, args: string) => ({
  command,
  args,
  origin: { kind: 'composer' } as const,
  presentation: { isFullscreen: true, columns: 120 },
})

const world = (on: On, root = '/proj') => {
  mock.store(on)
  mock.clock(on, { now: Date.UTC(2026, 5, 15, 12) })
  on('session.root', () => ({ value: root }))
}

test('saves notes, lists them numbered and removes one', async ($, on) => {
  world(on)

  expect((await $.command.run(run('notes', ''))).text).toContain('No notes in this project yet')
  expect((await $.command.run(run('note', '  buy milk '))).text).toBe('Note 1 saved.')
  expect((await $.command.run(run('note', 'call Ana'))).text).toBe('Note 2 saved.')

  const listed = (await $.command.run(run('notes', ''))).text ?? ''
  expect(listed).toContain('1. buy milk  (')
  expect(listed).toContain('2. call Ana  (')

  expect((await $.command.run(run('notes', 'rm 1'))).text).toBe('Note 1 removed.')
  const after = (await $.command.run(run('notes', ''))).text ?? ''
  expect(after).toContain('1. call Ana')
  expect(after).not.toContain('buy milk')

  expect((await $.command.run(run('notes', 'clear'))).text).toBe('1 note(s) removed.')
  expect((await $.command.run(run('notes', ''))).text).toContain('No notes')
})

test('rejects an empty note and a note that does not exist', async ($, on) => {
  world(on)

  expect((await $.command.run(run('note', '   '))).text).toBe('Usage: /note <text>')
  await $.command.run(run('note', 'one'))
  expect((await $.command.run(run('notes', 'rm 5'))).text).toBe('No such note: 5')
  expect((await $.command.run(run('notes', 'rm x'))).text).toBe('No such note: x')
})

test('keeps one list per project', async ($, on) => {
  mock.store(on)
  mock.clock(on)
  let root = '/a'
  on('session.root', () => ({ value: root }))

  await $.command.run(run('note', 'only in a'))
  root = '/b'
  expect((await $.command.run(run('notes', ''))).text).toContain('No notes')
  root = '/a'
  expect((await $.command.run(run('notes', ''))).text).toContain('only in a')
})

test('speaks the language set in the hub', async ($, on) => {
  world(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => PT)

  expect((await $.command.run(run('note', ''))).text).toBe('Uso: /note <texto>')
  expect((await $.command.run(run('note', 'x'))).text).toBe('Nota 1 salva.')
  expect((await $.command.run(run('notes', 'rm 9'))).text).toBe('Nota inexistente: 9')
})

test('speaks Spanish when the hub is set to es', async ($, on) => {
  world(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ES)

  expect((await $.command.run(run('notes', ''))).text).toBe('Todavía no hay notas en este proyecto. Añade una con /note <texto>.')
  expect((await $.command.run(run('note', 'llamar a Ana'))).text).toBe('Nota 1 guardada.')
  expect((await $.command.run(run('notes', 'rm 1'))).text).toBe('Nota 1 borrada.')
  expect((await $.command.run(run('notes', 'rm 1'))).text).toBe('No existe la nota: 1')
  expect((await $.command.run(run('notes', 'clear'))).text).toBe('0 nota(s) borrada(s).')
})

test('dates each note in the format of the language', async ($, on) => {
  world(on)
  const lang = { value: 'en' }
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: lang.value as 'en', version: 1 } }))

  await $.command.run(run('note', 'ship it'))
  const day = new Date(Date.UTC(2026, 5, 15, 12))

  for (const [code, locale] of [['en', 'en-US'], ['pt', 'pt-BR'], ['es', 'es-ES']] as const) {
    lang.value = code
    expect((await $.command.run(run('notes', ''))).text, code).toBe(`1. ship it  (${day.toLocaleDateString(locale)})`)
  }
})

test('takes up the notes a previous session left in the store', async ($, on) => {
  mock.store(on, { 'notes:/proj': [{ text: 'from yesterday', at: Date.UTC(2026, 5, 14, 12) }] })
  mock.clock(on, { now: Date.UTC(2026, 5, 15, 12) })
  on('session.root', () => ({ value: '/proj' }))

  expect((await $.command.run(run('notes', ''))).text).toContain('1. from yesterday')
  expect((await $.command.run(run('note', 'today'))).text).toBe('Note 2 saved.')
})

test('ignores a store entry that is not a list', async ($, on) => {
  mock.store(on, { 'notes:/proj': 'garbage' })
  mock.clock(on)
  on('session.root', () => ({ value: '/proj' }))

  expect((await $.command.run(run('notes', ''))).text).toContain('No notes in this project yet')
  expect((await $.command.run(run('notes', 'rm 0'))).text).toBe('No such note: 0')
})

test('registers both commands in the language set in the hub', async ($, on) => {
  world(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => PT)
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  const registered: string[] = []
  on('command.register', (_$, e) => {
    registered.push(`${e.name}: ${e.description}`)

    return { value: { command: e.name } }
  })

  await $.session.start({ cwd: '/proj', surface: null, isInteractive: true })
  expect(registered).toEqual([
    'note: Salva uma nota rápida neste projeto (persistente entre sessões)',
    'notes: Lista as notas do projeto; /notes rm <n> remove uma; /notes clear apaga todas',
  ])
})
