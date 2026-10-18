import { expect, test } from 'claude-code/testing'

const ANSWER = { result: undefined as never }
const SHELL = { result: { stdout: '', stderr: '', interrupted: false } }

const done = { answer: '', isAborted: false, turnId: 't-1', reason: 'answer', durationMs: 5000 } as const

const setup = (on: any) => {
  const toasts: string[] = []
  on('turn.start', (_: unknown, e: { turnId: string }) => ({ turnId: e.turnId }))
  on('tool.call', { tool: 'Edit' }, () => ANSWER)
  on('tool.call', { tool: 'Write' }, () => ANSWER)
  on('tool.call', { tool: 'Bash' }, () => SHELL)
  on('turn.complete', (_: unknown, e: { answer: string }) => ({ text: e.answer }))
  on('ui.toast', (_: unknown, e: { text: string }) => {
    toasts.push(e.text)

    return { value: undefined }
  })

  return toasts
}

test('toasts when code changed and no test ran', async ($, on) => {
  const toasts = setup(on)

  await $.turn.start({ text: 'go', turnId: 't-1' })
  await $.tool.call({ tool: 'Edit', file_path: 'src/a.ts', old_string: 'x', new_string: 'y', tool_use_id: 'e1' })
  await $.tool.call({ tool: 'Write', file_path: 'src/b.py', content: 'x', tool_use_id: 'w1' })
  await $.tool.call({ tool: 'Edit', file_path: 'src/a.ts', old_string: 'y', new_string: 'z', tool_use_id: 'e2' })
  await $.turn.complete(done)
  expect(toasts).toEqual(['2 files changed, no tests run this turn'])
})

test('stays quiet when a test ran, for tests and docs, and for aborted turns', async ($, on) => {
  const toasts = setup(on)

  await $.turn.start({ text: 'go', turnId: 't-1' })
  await $.tool.call({ tool: 'Edit', file_path: 'src/a.ts', old_string: 'x', new_string: 'y', tool_use_id: 'e1' })
  await $.tool.call({ tool: 'Bash', command: 'npm test', tool_use_id: 'b1' })
  await $.turn.complete(done)

  await $.turn.start({ text: 'go', turnId: 't-2' })
  await $.tool.call({ tool: 'Edit', file_path: 'src/a.test.ts', old_string: 'x', new_string: 'y', tool_use_id: 'e2' })
  await $.tool.call({ tool: 'Edit', file_path: 'README.md', old_string: 'x', new_string: 'y', tool_use_id: 'e3' })
  await $.turn.complete(done)

  await $.turn.start({ text: 'go', turnId: 't-3' })
  await $.tool.call({ tool: 'Edit', file_path: 'src/a.ts', old_string: 'x', new_string: 'y', tool_use_id: 'e4' })
  await $.turn.complete({ ...done, reason: 'aborted', isAborted: true })
  expect(toasts).toEqual([])
})

test('speaks the language set in the hub', async ($, on) => {
  const toasts = setup(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  await $.turn.start({ text: 'go', turnId: 't-1' })
  await $.tool.call({ tool: 'Edit', file_path: 'src/a.ts', old_string: 'x', new_string: 'y', tool_use_id: 'e1' })
  await $.turn.complete(done)
  expect(toasts).toEqual(['1 arquivo alterado, nenhum teste rodou neste turno'])
})

test('counts a test run from PowerShell and other runners', async ($, on) => {
  const toasts = setup(on)
  on('tool.call', { tool: 'PowerShell' }, () => SHELL)

  const commands: [string, string][] = [
    ['PowerShell', 'npx vitest run'],
    ['Bash', 'python -m pytest -q'],
    ['Bash', 'cargo test'],
    ['Bash', 'pnpm run test'],
  ]

  for (const [tool, command] of commands) {
    await $.turn.start({ text: 'go', turnId: command })
    await $.tool.call({ tool: 'Edit', file_path: 'src/a.ts', old_string: 'x', new_string: 'y', tool_use_id: `e-${command}` })
    await $.tool.call({ tool, command, tool_use_id: `c-${command}` } as never)
    await $.turn.complete(done)
  }

  expect(toasts).toEqual([])
})

test('ignores subagents and denied calls', async ($, on) => {
  const toasts: string[] = []
  on('turn.start', (_: unknown, e: { turnId: string }) => ({ turnId: e.turnId }))
  on('tool.call', { tool: 'Edit' }, (_: unknown, e: { file_path: string }) => (e.file_path.includes('denied') ? { deny: 'no' } : ANSWER))
  on('tool.call', { tool: 'Bash' }, () => SHELL)
  on('turn.complete', (_: unknown, e: { answer: string }) => ({ text: e.answer }))
  on('ui.toast', (_: unknown, e: { text: string }) => {
    toasts.push(e.text)

    return { value: undefined }
  })

  await $.turn.start({ text: 'go', turnId: 't-1' })
  await $.tool.call({ tool: 'Edit', file_path: 'src/sub.ts', old_string: 'x', new_string: 'y', tool_use_id: 'e1', ...{ agentId: 'sub' } })
  await $.tool.call({ tool: 'Edit', file_path: 'src/denied.ts', old_string: 'x', new_string: 'y', tool_use_id: 'e2' })
  await $.turn.complete(done)
  expect(toasts).toEqual([])

  await $.turn.start({ text: 'go', turnId: 't-2' })
  await $.tool.call({ tool: 'Edit', file_path: 'src/a.ts', old_string: 'x', new_string: 'y', tool_use_id: 'e3' })
  await $.tool.call({ tool: 'Bash', command: 'npm test', tool_use_id: 'b1', ...{ agentId: 'sub' } })
  await $.turn.complete(done)
  expect(toasts).toEqual(['1 file changed, no tests run this turn'])
})

test('treats test folders and Java test classes as tests', async ($, on) => {
  const toasts = setup(on)

  await $.turn.start({ text: 'go', turnId: 't-1' })

  for (const file_path of ['src/__tests__/a.ts', 'tests/b.py', 'test_c.py', 'src/FooTest.java', String.raw`app\tests\d.go`]) {
    await $.tool.call({ tool: 'Write', file_path, content: 'x', tool_use_id: `w-${file_path}` })
  }

  await $.turn.complete(done)
  expect(toasts).toEqual([])
})

test('a subagent finishing does not toast', async ($, on) => {
  const toasts = setup(on)

  await $.turn.start({ text: 'go', turnId: 't-1' })
  await $.tool.call({ tool: 'Edit', file_path: 'src/a.ts', old_string: 'x', new_string: 'y', tool_use_id: 'e1' })
  await $.turn.complete({ ...done, agentId: 'sub' })
  expect(toasts).toEqual([])
})

test('speaks Spanish with the plural', async ($, on) => {
  const toasts = setup(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  await $.turn.start({ text: 'go', turnId: 't-1' })
  await $.tool.call({ tool: 'Edit', file_path: 'src/a.go', old_string: 'x', new_string: 'y', tool_use_id: 'e1' })
  await $.tool.call({ tool: 'Write', file_path: 'src/b.rs', content: 'x', tool_use_id: 'w1' })
  await $.turn.complete(done)
  expect(toasts).toEqual(['2 archivos cambiados, ningún test se ejecutó en este turno'])
})
