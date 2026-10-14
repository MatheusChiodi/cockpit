import { expect, test } from 'claude-code/testing'

const ANSWER = { result: undefined as never }

const BLOCKED: readonly [string, string][] = [
  ['a.ts', 'const x = 1\n  debugger\n  return x'],
  ['a.jsx', 'debugger;'],
  ['a.py', 'breakpoint()'],
  ['a.py', 'import pdb; pdb.set_trace()'],
  ['a.py', 'import ipdb'],
  ['a.rb', 'binding.pry'],
  ['a.rb', 'byebug'],
]

const ALLOWED: readonly [string, string][] = [
  ['a.ts', 'const debuggerEnabled = true'],
  ['a.ts', '// remove the debugger statement before shipping'],
  ['a.ts', "log('debugger attached')"],
  ['a.py', 'def set_breakpoint(line): pass'],
  ['notes.md', 'debugger'],
]

test('refuses an edit that adds a leftover breakpoint', async ($, on) => {
  on('tool.call', { tool: 'Edit' }, () => ANSWER)

  for (const [file_path, new_string] of BLOCKED) {
    const answer = await $.tool.call({ tool: 'Edit', file_path, old_string: 'x', new_string, tool_use_id: `b-${new_string}` })
    expect(answer.deny, new_string).toContain('debugger-guard blocked the edit')
  }
})

test('refuses a Write that holds one', async ($, on) => {
  on('tool.call', { tool: 'Write' }, () => ANSWER)

  const answer = await $.tool.call({ tool: 'Write', file_path: 'a.js', content: 'run()\ndebugger\n', tool_use_id: 'w-1' })
  expect(answer.deny).toContain('"debugger" statement')
})

test('lets ordinary edits through, and a breakpoint the edit did not add', async ($, on) => {
  on('tool.call', { tool: 'Edit' }, () => ANSWER)

  for (const [file_path, new_string] of ALLOWED) {
    const answer = await $.tool.call({ tool: 'Edit', file_path, old_string: 'x', new_string, tool_use_id: `a-${new_string}` })
    expect(answer.deny, new_string).toBeUndefined()
  }

  const kept = await $.tool.call({
    tool: 'Edit',
    file_path: 'a.ts',
    old_string: 'debugger\n  run()',
    new_string: 'debugger\n  run(1)',
    tool_use_id: 'k-1',
  })
  expect(kept.deny).toBeUndefined()
})

test('speaks the language set in the hub', async ($, on) => {
  on('tool.call', { tool: 'Edit' }, () => ANSWER)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  const answer = await $.tool.call({ tool: 'Edit', file_path: 'a.py', old_string: 'x', new_string: 'breakpoint()', tool_use_id: 'pt-1' })
  expect(answer.deny).toContain('debugger-guard bloqueou a edição')
})
