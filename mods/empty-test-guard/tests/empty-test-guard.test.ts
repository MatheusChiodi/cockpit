import { expect, test } from 'claude-code/testing'

const ANSWER = { result: undefined as never }

const BLOCKED: readonly [string, string][] = [
  ['cart.test.ts', "it('adds an item', () => {\n  cart.add(1)\n})"],
  ['cart.spec.js', "test('totals', async () => { await total() })"],
  ['test_cart.py', 'def test_total():\n    cart.total()'],
  ['CartTest.java', '@Test\nvoid total() { cart.total(); }'],
]

const ALLOWED: readonly [string, string][] = [
  ['cart.test.ts', "it('adds an item', () => {\n  expect(cart.add(1)).toBe(1)\n})"],
  ['test_cart.py', 'def test_total():\n    assert cart.total() == 0'],
  ['CartTest.java', '@Test\nvoid total() { assertEquals(0, cart.total()); }'],
  ['cart.test.ts', 'const helper = () => cart.add(1)'],
  ['cart.ts', "it('is not a test file', () => {})"],
]

test('refuses test cases that assert nothing', async ($, on) => {
  on('tool.call', { tool: 'Edit' }, () => ANSWER)

  for (const [file_path, new_string] of BLOCKED) {
    const answer = await $.tool.call({ tool: 'Edit', file_path, old_string: 'x', new_string, tool_use_id: `b-${new_string}` })
    expect(answer.deny, new_string).toContain('empty-test-guard blocked the edit')
  }
})

test('refuses a Write of a test file with no assertion', async ($, on) => {
  on('tool.call', { tool: 'Write' }, () => ANSWER)

  const answer = await $.tool.call({ tool: 'Write', file_path: 'a.test.ts', content: "it('a', () => {})", tool_use_id: 'w-1' })
  expect(answer.deny).toContain('no assertion')
})

test('lets asserting tests and non-test edits through', async ($, on) => {
  on('tool.call', { tool: 'Edit' }, () => ANSWER)

  for (const [file_path, new_string] of ALLOWED) {
    const answer = await $.tool.call({ tool: 'Edit', file_path, old_string: 'x', new_string, tool_use_id: `a-${new_string}` })
    expect(answer.deny, new_string).toBeUndefined()
  }

  const kept = await $.tool.call({
    tool: 'Edit',
    file_path: 'cart.test.ts',
    old_string: "it('a', () => {})",
    new_string: "it('a', () => { run() })",
    tool_use_id: 'k-1',
  })
  expect(kept.deny).toBeUndefined()
})

test('speaks the language set in the hub', async ($, on) => {
  on('tool.call', { tool: 'Edit' }, () => ANSWER)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  const answer = await $.tool.call({
    tool: 'Edit',
    file_path: 'a.test.ts',
    old_string: 'x',
    new_string: "it('a', () => {})",
    tool_use_id: 'pt-1',
  })
  expect(answer.deny).toContain('empty-test-guard bloqueou a edição')
})
