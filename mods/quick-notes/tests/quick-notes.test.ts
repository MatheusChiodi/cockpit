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
