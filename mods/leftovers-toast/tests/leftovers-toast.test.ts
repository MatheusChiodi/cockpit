import { expect, test } from 'claude-code/testing'

const ANSWER = { result: undefined as never }

const done = { answer: '', isAborted: false, turnId: 't-1', reason: 'answer', durationMs: 5000 } as const

const setup = (on: any) => {
  const toasts: string[] = []
  on('turn.start', (_: unknown, e: { turnId: string }) => ({ turnId: e.turnId }))
  on('tool.call', { tool: 'Edit' }, () => ANSWER)
  on('tool.call', { tool: 'Write' }, () => ANSWER)
  on('turn.complete', (_: unknown, e: { answer: string }) => ({ text: e.answer }))
  on('ui.toast', (_: unknown, e: { text: string }) => {
    toasts.push(e.text)

    return { value: undefined }
  })

  return toasts
}

const edit = (file_path: string, old_string: string, new_string: string, tool_use_id: string) =>
  ({ tool: 'Edit', file_path, old_string, new_string, tool_use_id }) as const

test('counts the debug logs and TODOs the edits added', async ($, on) => {
  const toasts = setup(on)

  await $.turn.start({ text: 'go', turnId: 't-1' })
  await $.tool.call(edit('src/a.ts', 'x', "console.log('a')\nconsole.debug(b) // TODO tidy", 'e1'))
  await $.tool.call({ tool: 'Write', file_path: 'src/b.py', content: 'print(1)\n# FIXME later\n', tool_use_id: 'w1' })
  await $.tool.call(edit('src/C.java', 'x', 'System.out.println(c);', 'e2'))
  await $.turn.complete(done)
  expect(toasts).toEqual(['Left behind: 4 debug logs, 2 TODOs'])
})

test('ignores markers the edit did not add, tests, other languages and aborted turns', async ($, on) => {
  const toasts = setup(on)

  await $.turn.start({ text: 'go', turnId: 't-1' })
  await $.tool.call(edit('src/a.ts', "console.log('old') // TODO", "console.log('new') // TODO", 'e1'))
  await $.tool.call(edit('src/a.test.ts', 'x', "console.log('a')", 'e2'))
  await $.tool.call(edit('src/a.ts', 'x', 'print(1)', 'e3'))
  await $.tool.call(edit('README.md', 'x', 'TODO write docs', 'e4'))
  await $.turn.complete(done)
  expect(toasts).toEqual([])

  await $.turn.start({ text: 'go', turnId: 't-2' })
  await $.tool.call(edit('src/a.ts', 'x', "console.log('a')", 'e5'))
  await $.turn.complete({ ...done, reason: 'aborted', isAborted: true })
  expect(toasts).toEqual([])
})

test('speaks the language set in the hub', async ($, on) => {
  const toasts = setup(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  await $.turn.start({ text: 'go', turnId: 't-1' })
  await $.tool.call(edit('src/a.ts', 'x', "console.log('a') // TODO", 'e1'))
  await $.turn.complete(done)
  expect(toasts).toEqual(['Ficou para trás: 1 log de debug, 1 TODO'])
})

test('singular forms and a TODO without logs', async ($, on) => {
  const toasts = setup(on)

  await $.turn.start({ text: 'go', turnId: 't-1' })
  await $.tool.call(edit('src/a.go', 'x', '// HACK around the bug', 'e1'))
  await $.turn.complete(done)
  expect(toasts).toEqual(['Left behind: 1 TODO'])
})

test('ignores subagent edits and denied edits', async ($, on) => {
  const toasts: string[] = []
  on('turn.start', (_: unknown, e: { turnId: string }) => ({ turnId: e.turnId }))
  on('tool.call', { tool: 'Edit' }, (_: unknown, e: { tool_use_id: string }) => (e.tool_use_id === 'denied' ? { deny: 'no' } : ANSWER) as never)
  on('turn.complete', (_: unknown, e: { answer: string }) => ({ text: e.answer }))
  on('ui.toast', (_: unknown, e: { text: string }) => {
    toasts.push(e.text)

    return { value: undefined }
  })

  await $.turn.start({ text: 'go', turnId: 't-1' })
  await $.tool.call({ ...edit('src/a.ts', 'x', "console.log('a')", 'sub'), agentId: 'agent-1' } as never)
  await $.tool.call(edit('src/a.ts', 'x', "console.log('a')", 'denied'))
  await $.turn.complete(done)
  expect(toasts).toEqual([])
})

test('a new turn starts the count over', async ($, on) => {
  const toasts = setup(on)

  await $.turn.start({ text: 'go', turnId: 't-1' })
  await $.tool.call(edit('src/a.ts', 'x', "console.log('a')", 'e1'))
  await $.turn.start({ text: 'again', turnId: 't-2' })
  await $.tool.call(edit('src/a.ts', 'x', '// TODO', 'e2'))
  await $.turn.complete({ ...done, turnId: 't-2' })
  expect(toasts).toEqual(['Left behind: 1 TODO'])
})

test('test folders, test_ files and JVM test classes are skipped', async ($, on) => {
  const toasts = setup(on)

  await $.turn.start({ text: 'go', turnId: 't-1' })
  await $.tool.call(edit('tests/a.py', 'x', 'print(1)', 'e1'))
  await $.tool.call(edit('src/test_a.py', 'x', 'print(1)', 'e2'))
  await $.tool.call(edit('src/AppTest.java', 'x', 'System.out.println(1);', 'e3'))
  await $.tool.call(edit('src/__tests__/a.js', 'x', 'console.log(1)', 'e4'))
  await $.turn.complete(done)
  expect(toasts).toEqual([])
})

test('speaks Spanish from the hub', async ($, on) => {
  const toasts = setup(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  await $.turn.start({ text: 'go', turnId: 't-1' })
  await $.tool.call(edit('src/a.ts', 'x', 'console.log(1)\nconsole.log(2)', 'e1'))
  await $.turn.complete(done)
  expect(toasts).toEqual(['Quedó atrás: 2 logs de depuración'])
})
