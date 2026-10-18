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

test('speaks Spanish when the hub is set to es', async ($, on) => {
  on('tool.call', { tool: 'Edit' }, () => ANSWER)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  const answer = await $.tool.call({ tool: 'Edit', file_path: 'a.rb', old_string: 'x', new_string: 'binding.pry', tool_use_id: 'es-1' })
  expect(answer.deny).toBe('debugger-guard bloqueó la edición: añade "binding.pry". Un breakpoint olvidado congela el programa; quítalo.')
})

test('covers every script extension it knows', async ($, on) => {
  on('tool.call', { tool: 'Write' }, () => ANSWER)

  for (const file_path of ['a.mjs', 'a.cts', 'App.vue', 'Page.svelte', 'C:\\src\\a.TSX']) {
    const answer = await $.tool.call({ tool: 'Write', file_path, content: '  debugger;  ', tool_use_id: `x-${file_path}` })
    expect(answer.deny, file_path).toContain('"debugger" statement')
  }

  const stub = await $.tool.call({ tool: 'Write', file_path: 'a.pyi', content: 'import pdb', tool_use_id: 'pyi' })
  expect(stub.deny).toContain('"import pdb"')
})

test('a marker only counts in its own language', async ($, on) => {
  on('tool.call', { tool: 'Write' }, () => ANSWER)

  for (const [file_path, content] of [
    ['a.rb', 'debugger'],
    ['a.ts', 'binding.pry'],
    ['a.py', 'byebug'],
    ['a.go', 'breakpoint()'],
  ] as const) {
    expect((await $.tool.call({ tool: 'Write', file_path, content, tool_use_id: `l-${file_path}` })).deny, file_path).toBeUndefined()
  }
})

test('an edit that removes a breakpoint, or adds a method named breakpoint, goes through', async ($, on) => {
  on('tool.call', { tool: 'Edit' }, () => ANSWER)

  const removed = await $.tool.call({ tool: 'Edit', file_path: 'a.py', old_string: 'breakpoint()\nrun()', new_string: 'run()', tool_use_id: 'r1' })
  expect(removed.deny).toBeUndefined()

  const method = await $.tool.call({ tool: 'Edit', file_path: 'a.py', old_string: 'x', new_string: 'debugger.breakpoint()', tool_use_id: 'r2' })
  expect(method.deny).toBeUndefined()
})

test('a second breakpoint added beside one already there is refused', async ($, on) => {
  on('tool.call', { tool: 'Edit' }, () => ANSWER)

  const answer = await $.tool.call({
    tool: 'Edit',
    file_path: 'a.ts',
    old_string: 'debugger\nrun()',
    new_string: 'debugger\nrun()\ndebugger',
    tool_use_id: 'twice',
  })
  expect(answer.deny).toContain('debugger-guard')
})

test('refuses with the failure text when the check itself fails', async ($, on) => {
  let ran = 0
  on('tool.call', { tool: 'Edit' }, () => {
    ran += 1

    return ANSWER
  })
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ deny: 'state unavailable' }))

  const answer = await $.tool.call({ tool: 'Edit', file_path: 'a.py', old_string: 'x', new_string: 'breakpoint()', tool_use_id: 'f-1' })
  expect(answer.deny).toBe('debugger-guard: the check failed, edit refused.')
  expect(ran).toBe(0)
})

test('names binding.irb as binding.irb', async ($, on) => {
  on('tool.call', { tool: 'Edit' }, () => ANSWER)

  const answer = await $.tool.call({ tool: 'Edit', file_path: 'a.rb', old_string: 'x', new_string: 'binding.irb', tool_use_id: 'irb-1' })
  expect(answer.deny).toContain('it adds "binding.irb"')
})
