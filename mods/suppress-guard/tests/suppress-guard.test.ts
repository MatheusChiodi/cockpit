import { expect, test } from 'claude-code/testing'

const ANSWER = { result: undefined as never }

const BLOCKED: readonly [string, string][] = [
  ['a.ts', '/* eslint-disable */\nconst a = 1'],
  ['a.ts', '// eslint-disable-next-line\nconst a: any = 1'],
  ['a.ts', '// @ts-ignore\nfoo()'],
  ['a.ts', '// @ts-nocheck'],
  ['a.py', 'import x  # type: ignore'],
  ['a.py', 'import x  # noqa'],
  ['a.go', 'f() //nolint'],
  ['A.java', '@SuppressWarnings("all")\nclass A {}'],
]

const ALLOWED: readonly [string, string][] = [
  ['a.ts', '// @ts-expect-error: legacy typing\nfoo()'],
  ['a.py', 'import x  # type: ignore[import-untyped]'],
  ['a.py', 'x = 1  # noqa: E501'],
  ['a.go', 'f() //nolint:errcheck'],
  ['A.java', '@SuppressWarnings("unchecked")\nclass A {}'],
  ['README.md', 'Use eslint-disable sparingly'],
]

test('refuses an edit that adds a blanket suppression', async ($, on) => {
  on('tool.call', { tool: 'Edit' }, () => ANSWER)

  for (const [file_path, new_string] of BLOCKED) {
    const answer = await $.tool.call({ tool: 'Edit', file_path, old_string: 'x', new_string, tool_use_id: `b-${new_string}` })
    expect(answer.deny, new_string).toContain('suppress-guard blocked the edit')
  }
})

test('refuses a Write that holds one', async ($, on) => {
  on('tool.call', { tool: 'Write' }, () => ANSWER)

  const answer = await $.tool.call({ tool: 'Write', file_path: 'a.ts', content: '// @ts-ignore\nfoo()', tool_use_id: 'w-1' })
  expect(answer.deny).toContain('@ts-ignore')
})

test('lets targeted suppressions and suppressions the edit did not add through', async ($, on) => {
  on('tool.call', { tool: 'Edit' }, () => ANSWER)

  for (const [file_path, new_string] of ALLOWED) {
    const answer = await $.tool.call({ tool: 'Edit', file_path, old_string: 'x', new_string, tool_use_id: `a-${new_string}` })
    expect(answer.deny, new_string).toBeUndefined()
  }

  const kept = await $.tool.call({
    tool: 'Edit',
    file_path: 'a.ts',
    old_string: '// @ts-ignore\nfoo()',
    new_string: '// @ts-ignore\nfoo(1)',
    tool_use_id: 'k-1',
  })
  expect(kept.deny).toBeUndefined()
})

test('speaks the language set in the hub', async ($, on) => {
  on('tool.call', { tool: 'Edit' }, () => ANSWER)
  // Stands in for the hub: answers the language it would hold.
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  const answer = await $.tool.call({ tool: 'Edit', file_path: 'a.ts', old_string: 'x', new_string: '// @ts-ignore', tool_use_id: 'pt-1' })
  expect(answer.deny).toContain('suppress-guard bloqueou a edição')
})

test('names the marker in the reason and never runs the refused edit', async ($, on) => {
  let ran = 0
  on('tool.call', { tool: 'Edit' }, () => {
    ran += 1

    return ANSWER
  })

  const answer = await $.tool.call({ tool: 'Edit', file_path: 'a.py', old_string: 'x', new_string: 'x  # NOQA', tool_use_id: 'n-1' })
  expect(answer.deny).toBe(
    'suppress-guard blocked the edit: it adds "# noqa". A blanket suppression hides the problem; fix the cause, or suppress one named rule with a reason.',
  )
  expect(ran).toBe(0)
})

test('catches the long form of SuppressWarnings all', async ($, on) => {
  on('tool.call', { tool: 'Write' }, () => ANSWER)

  const answer = await $.tool.call({
    tool: 'Write',
    file_path: 'src/A.kt',
    content: '@SuppressWarnings(value = {"all"})\nclass A',
    tool_use_id: 'w-sw',
  })
  expect(answer.deny).toContain('@SuppressWarnings("all")')
})

test('refuses an edit that swaps one blanket suppression for another', async ($, on) => {
  on('tool.call', { tool: 'Edit' }, () => ANSWER)

  const answer = await $.tool.call({
    tool: 'Edit',
    file_path: 'a.tsx',
    old_string: '// eslint-disable-next-line\nfoo()',
    new_string: '// @ts-ignore\nfoo()',
    tool_use_id: 's-1',
  })
  expect(answer.deny).toContain('"@ts-ignore"')
})

test('lets removals and non-code files through', async ($, on) => {
  on('tool.call', { tool: 'Edit' }, () => ANSWER)
  on('tool.call', { tool: 'Write' }, () => ANSWER)

  const removed = await $.tool.call({ tool: 'Edit', file_path: 'a.ts', old_string: '// @ts-ignore\nfoo()', new_string: 'foo()', tool_use_id: 'r-1' })
  expect(removed.deny).toBeUndefined()

  const docs = await $.tool.call({ tool: 'Write', file_path: 'notes.txt', content: '// @ts-ignore', tool_use_id: 'r-2' })
  expect(docs.deny).toBeUndefined()
})

test('speaks Spanish when the hub is set to es', async ($, on) => {
  on('tool.call', { tool: 'Write' }, () => ANSWER)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  const answer = await $.tool.call({ tool: 'Write', file_path: 'main.go', content: 'f() //nolint', tool_use_id: 'es-1' })
  expect(answer.deny).toBe(
    'suppress-guard bloqueó la edición: añade "//nolint". Una supresión genérica oculta el problema; corrige la causa o suprime una regla con nombre, con el motivo.',
  )
})
