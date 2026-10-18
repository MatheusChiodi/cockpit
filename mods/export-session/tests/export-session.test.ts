import { expect, mock, test } from 'claude-code/testing'

const NOW = new Date(2026, 9, 13, 15, 42).getTime()

const run = (args: string) => ({
  command: 'save-session',
  args,
  origin: { kind: 'composer' } as const,
  presentation: { isFullscreen: true, columns: 120 },
})

const MESSAGES = [
  { role: 'user' as const, text: 'Fix the login redirect', toolUses: [] },
  {
    role: 'assistant' as const,
    text: 'Done.',
    toolUses: [
      { tool_use_id: 't1', tool: 'Read', input: {} },
      { tool_use_id: 't2', tool: 'Edit', input: {} },
      { tool_use_id: 't3', tool: 'Read', input: {} },
    ],
  },
  { role: 'user' as const, text: '', toolUses: [], toolResults: [] },
]

const world = (on: Parameters<typeof mock.clock>[0], messages: unknown[]) => {
  mock.clock(on, { now: NOW })
  const written: { path: string; text: string }[] = []
  on('session.messages', () => ({ value: messages as never }))
  on('session.root', () => ({ value: '/work/app' }))
  on('fs.write', (_, e) => {
    // Normalized so the test reads the same on Windows, where the engine resolves the path.
    written.push({ path: e.path.replace(/\\/g, '/').replace(/^[A-Za-z]:/, ''), text: e.text })

    return { value: undefined }
  })

  return written
}

test('writes the conversation as Markdown under .claude-exports and says where', async ($, on) => {
  const written = world(on, MESSAGES)

  const answer = await $.command.run(run(''))
  expect(answer.text).toBe('Saved 2 message(s) to:\n.claude-exports/session-2026-10-13-1542.md')
  expect(written).toHaveLength(1)
  expect(written[0]?.path).toBe('/work/app/.claude-exports/session-2026-10-13-1542.md')

  const text = written[0]?.text ?? ''
  expect(text).toContain('# Session export')
  expect(text).toContain('- Project: /work/app')
  expect(text).toContain('## You\n\nFix the login redirect')
  expect(text).toContain('## Claude\n\nDone.\n\n*Tools: Read, Edit*')
})

test('keeps a given name inside the folder', async ($, on) => {
  const written = world(on, MESSAGES)

  await $.command.run(run('notes'))
  await $.command.run(run('../../etc/passwd'))
  await $.command.run(run('my chat.MD'))
  expect(written.map(file => file.path)).toEqual([
    '/work/app/.claude-exports/notes.md',
    '/work/app/.claude-exports/passwd.md',
    '/work/app/.claude-exports/my-chat.MD',
  ])
})

test('writes nothing for an empty conversation', async ($, on) => {
  const written = world(on, [])

  expect((await $.command.run(run(''))).text).toContain('nothing to save')
  expect(written).toHaveLength(0)
})

test('speaks the language set in the hub', async ($, on) => {
  const written = world(on, MESSAGES)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  expect((await $.command.run(run(''))).text).toContain('2 mensagem(ns) salva(s) em:')
  expect(written[0]?.text).toContain('## Você')
})

test('reports a file that cannot be written', async ($, on) => {
  mock.clock(on, { now: NOW })
  on('session.messages', () => ({ value: MESSAGES as never }))
  on('session.root', () => ({ value: '/work/app' }))
  on('fs.write', () => ({ deny: 'disk full' }))

  const text = (await $.command.run(run(''))).text ?? ''
  expect(text).toContain('Could not write the file:')
  expect(text).toContain('disk full')
})

test('drops leading dots and falls back to the time stamp when no name is left', async ($, on) => {
  const written = world(on, MESSAGES)

  await $.command.run(run('.hidden'))
  await $.command.run(run('...'))
  await $.command.run(run('dir\\sub\\win.txt'))
  expect(written.map(file => file.path)).toEqual([
    '/work/app/.claude-exports/hidden.md',
    '/work/app/.claude-exports/session-2026-10-13-1542.md',
    '/work/app/.claude-exports/win.txt.md',
  ])
})

test('keeps a turn that only used tools, and counts it in the header', async ($, on) => {
  const written = world(on, [
    { role: 'user' as const, text: 'go', toolUses: [] },
    { role: 'assistant' as const, text: '  ', toolUses: [{ tool_use_id: 't1', tool: 'Bash', input: {} }] },
  ])

  expect((await $.command.run(run(''))).text).toContain('Saved 2 message(s)')
  const text = written[0]?.text ?? ''
  expect(text).toContain('- Messages: 2')
  expect(text).toContain('## Claude\n\n*Tools: Bash*')
  expect(text).toContain(`- Date: ${new Date(NOW).toISOString()}`)
})

test('speaks Spanish in the answer and the file', async ($, on) => {
  const written = world(on, MESSAGES)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  expect((await $.command.run(run(''))).text).toContain('2 mensaje(s) guardado(s) en:')
  const text = written[0]?.text ?? ''
  expect(text).toContain('# Exportación de la sesión')
  expect(text).toContain('## Tú')
  expect(text).toContain('*Herramientas: Read, Edit*')
})

test('says the conversation is empty in Portuguese', async ($, on) => {
  world(on, [{ role: 'user' as const, text: '   ', toolUses: [] }])
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  expect((await $.command.run(run(''))).text).toBe('A conversa está vazia: nada para salvar.')
})
