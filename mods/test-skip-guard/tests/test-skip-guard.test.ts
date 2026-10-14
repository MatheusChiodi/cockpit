import { expect, test } from 'claude-code/testing'

const ANSWER = { result: undefined as never }

const BLOCKED: readonly [string, string][] = [
  ['a.test.ts', "it.skip('works', () => {})"],
  ['a.test.ts', "describe.only('cart', () => {})"],
  ['a.spec.js', "xit('works', () => {})"],
  ['a.spec.js', "fdescribe('cart', () => {})"],
  ['A.java', '@Ignore\n@Test void works() {}'],
  ['A.kt', '@Disabled("later")\n@Test fun works() {}'],
  ['test_a.py', '@pytest.mark.skip\ndef test_works(): pass'],
]

const ALLOWED: readonly [string, string][] = [
  ['a.test.ts', "it('works', () => {})"],
  ['a.test.ts', 'const rest = list.filter(Boolean)'],
  ['test_a.py', "@pytest.mark.skipif(sys.platform == 'win32', reason='posix')\ndef test_works(): pass"],
  ['model.py', 'model.fit(x, y)'],
  ['notes.md', 'Use it.skip( only while debugging'],
]

test('refuses an edit that adds a skipped or focused test', async ($, on) => {
  on('tool.call', { tool: 'Edit' }, () => ANSWER)

  for (const [file_path, new_string] of BLOCKED) {
    const answer = await $.tool.call({ tool: 'Edit', file_path, old_string: 'x', new_string, tool_use_id: `b-${new_string}` })
    expect(answer.deny, new_string).toContain('test-skip-guard blocked the edit')
  }
})

test('refuses a Write that holds one', async ($, on) => {
  on('tool.call', { tool: 'Write' }, () => ANSWER)

  const answer = await $.tool.call({ tool: 'Write', file_path: 'a.test.ts', content: "xit('a', () => {})", tool_use_id: 'w-1' })
  expect(answer.deny).toContain('"xit("')
})

test('lets ordinary edits through, and a marker the edit did not add', async ($, on) => {
  on('tool.call', { tool: 'Edit' }, () => ANSWER)

  for (const [file_path, new_string] of ALLOWED) {
    const answer = await $.tool.call({ tool: 'Edit', file_path, old_string: 'x', new_string, tool_use_id: `a-${new_string}` })
    expect(answer.deny, new_string).toBeUndefined()
  }

  const kept = await $.tool.call({
    tool: 'Edit',
    file_path: 'a.test.ts',
    old_string: "it.skip('old', () => {})",
    new_string: "it.skip('old', () => { expect(1).toBe(1) })",
    tool_use_id: 'k-1',
  })
  expect(kept.deny).toBeUndefined()
})

test('speaks the language set in the hub', async ($, on) => {
  on('tool.call', { tool: 'Edit' }, () => ANSWER)
  // Stands in for the hub: answers the language it would hold.
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  const answer = await $.tool.call({
    tool: 'Edit',
    file_path: 'a.test.ts',
    old_string: 'x',
    new_string: "it.skip('a', () => {})",
    tool_use_id: 'pt-1',
  })
  expect(answer.deny).toContain('test-skip-guard bloqueou a edição')
})
