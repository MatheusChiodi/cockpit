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

test('a blocked edit never reaches the file', async ($, on) => {
  let ran = 0
  on('tool.call', { tool: 'Edit' }, () => {
    ran += 1

    return ANSWER
  })

  await $.tool.call({ tool: 'Edit', file_path: 'a.test.ts', old_string: 'x', new_string: "test('a', () => {})", tool_use_id: 'n-1' })
  expect(ran).toBe(0)
})

test('reads Go and Kotlin tests', async ($, on) => {
  on('tool.call', { tool: 'Write' }, () => ANSWER)

  const go = await $.tool.call({ tool: 'Write', file_path: 'cart_test.go', content: 'func TestTotal(t *testing.T) {\n\tTotal()\n}', tool_use_id: 'g-1' })
  expect(go.deny).toContain('empty-test-guard blocked the edit')

  const goOk = await $.tool.call({ tool: 'Write', file_path: 'cart_test.go', content: 'func TestTotal(t *testing.T) {\n\tif Total() != 0 { t.Errorf("x") }\n}', tool_use_id: 'g-2' })
  expect(goOk.deny).toBeUndefined()

  const kt = await $.tool.call({ tool: 'Write', file_path: 'CartTests.kt', content: '@Test fun total() { cart.total() }', tool_use_id: 'k-1' })
  expect(kt.deny).toContain('empty-test-guard blocked the edit')
})

test('an edit that keeps the number of cases is not judged', async ($, on) => {
  on('tool.call', { tool: 'Edit' }, () => ANSWER)

  const answer = await $.tool.call({
    tool: 'Edit',
    file_path: 'test_cart.py',
    old_string: 'def test_a():\n    assert x',
    new_string: 'def test_b():\n    run()',
    tool_use_id: 'r-1',
  })
  expect(answer.deny).toBeUndefined()
})

test('chai should style counts as an assertion', async ($, on) => {
  on('tool.call', { tool: 'Write' }, () => ANSWER)

  const answer = await $.tool.call({ tool: 'Write', file_path: 'a.spec.js', content: "it('a', () => { x.should.equal(1) })", tool_use_id: 's-1' })
  expect(answer.deny).toBeUndefined()
})

test('speaks Spanish from the hub', async ($, on) => {
  on('tool.call', { tool: 'Write' }, () => ANSWER)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  const answer = await $.tool.call({ tool: 'Write', file_path: 'a.test.ts', content: "it('a', () => {})", tool_use_id: 'es-1' })
  expect(answer.deny).toBe(
    'empty-test-guard bloqueó la edición: añade casos de test sin ninguna aserción. Un test que no verifica nada siempre pasa; añade el expect o assert.',
  )
})
