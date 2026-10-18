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

const edit = ($: any, file_path: string, old_string: string, new_string: string) =>
  $.tool.call({ tool: 'Edit', file_path, old_string, new_string, tool_use_id: `e-${file_path}-${new_string}` })

test('names the marker that was added', async ($, on) => {
  on('tool.call', { tool: 'Edit' }, () => ANSWER)

  const CASES: [string, string, string][] = [
    ['a.test.tsx', "test.only('a', () => {})", '".only("'],
    ['a.test.mjs', "xtest('a', () => {})", '"xit("'],
    ['a.spec.cts', "fit('a', () => {})", '"fit("'],
    ['ATest.scala', '@Ignore def works = ()', '"@Ignore"'],
    ['ATest.cs', '@Disabled void works() {}', '"@Disabled"'],
  ]

  for (const [file, text, marker] of CASES) {
    expect((await edit($, file, 'x', text)).deny, text).toBe(`test-skip-guard blocked the edit: it adds ${marker}. A skipped or focused test hides failures; fix the test instead.`)
  }
})

test('refuses a second marker of a kind the old text already had', async ($, on) => {
  on('tool.call', { tool: 'Edit' }, () => ANSWER)

  const answer = await edit($, 'a.test.ts', "it.only('a', () => {})", "it.only('a', () => {})\nit.only('b', () => {})")
  expect(answer.deny).toContain('".only("')
})

test('lets markers in files of other languages through', async ($, on) => {
  on('tool.call', { tool: 'Edit' }, () => ANSWER)
  on('tool.call', { tool: 'Write' }, () => ANSWER)

  expect((await edit($, 'README.md', 'x', '@Ignore and @Disabled')).deny).toBeUndefined()
  expect((await edit($, 'test_a.py', 'x', "it.skip('a')")).deny).toBeUndefined()
  expect((await $.tool.call({ tool: 'Write', file_path: 'config.yaml', content: "xit('a')", tool_use_id: 'w-yaml' })).deny).toBeUndefined()
})

test('lets names that merely end in it or fit through', async ($, on) => {
  on('tool.call', { tool: 'Edit' }, () => ANSWER)

  for (const text of ['submit(form)', 'outfit(x)', 'obj.xit(1)', 'retrofit(a)']) {
    expect((await edit($, 'a.test.ts', 'x', text)).deny, text).toBeUndefined()
  }
})

test('speaks Spanish when the hub is set to es', async ($, on) => {
  on('tool.call', { tool: 'Write' }, () => ANSWER)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  const answer = await $.tool.call({ tool: 'Write', file_path: 'test_a.py', content: '@pytest.mark.skip\ndef test_a(): pass', tool_use_id: 'w-es' })
  expect(answer.deny).toBe('test-skip-guard bloqueó la edición: añade "@pytest.mark.skip". Un test omitido o enfocado oculta fallos; corrige el test.')
})
