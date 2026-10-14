import { expect, test } from 'claude-code/testing'

const ASKED: readonly [string, string][] = [
  ['a.ts', 'const data: any = load()'],
  ['a.tsx', 'const x = JSON.parse(raw) as any'],
  ['a.ts', 'const x = <any>value'],
  ['a.ts', 'function f(items: any[]) {}'],
]

const FINE: readonly [string, string][] = [
  ['a.ts', 'const data: unknown = load()'],
  ['a.ts', 'const company = ok ? a : anything'],
  ['a.js', 'const data: any = load()'],
  ['a.ts', '// eslint-disable-next-line @typescript-eslint/no-explicit-any'],
]

test('asks before an edit adds any to TypeScript', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))

  for (const [file_path, new_string] of ASKED) {
    const verdict = await $.tool.check({ tool: 'Edit', input: { file_path, old_string: 'x', new_string } })
    expect(verdict.decision, new_string).toBe('ask')
    expect(verdict.reason, new_string).toContain('Confirm before running.')
  }

  const write = await $.tool.check({ tool: 'Write', input: { file_path: 'a.ts', content: 'let a: any' } })
  expect(write.reason).toBe('any-guard: the edit adds ": any", which turns type checking off. Confirm before running.')
})

test('leaves the rest allowed, and an any the edit did not add', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))

  for (const [file_path, new_string] of FINE) {
    const verdict = await $.tool.check({ tool: 'Edit', input: { file_path, old_string: 'x', new_string } })
    expect(verdict.decision, new_string).toBe('allow')
  }

  const kept = await $.tool.check({
    tool: 'Edit',
    input: { file_path: 'a.ts', old_string: 'let a: any = 1', new_string: 'let a: any = 2' },
  })
  expect(kept.decision).toBe('allow')

  const bash = await $.tool.check({ tool: 'Bash', input: { command: 'echo "x: any"' } })
  expect(bash.decision).toBe('allow')
})

test('keeps a denial beneath it', async ($, on) => {
  on('tool.check', () => ({ decision: 'deny', reason: 'no' }))

  const verdict = await $.tool.check({ tool: 'Edit', input: { file_path: 'a.ts', old_string: 'x', new_string: 'let a: any' } })
  expect(verdict.decision).toBe('deny')
})

test('speaks the language set in the hub', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  const verdict = await $.tool.check({ tool: 'Edit', input: { file_path: 'a.ts', old_string: 'x', new_string: 'let a: any' } })
  expect(verdict.reason).toContain('a edição adiciona ": any"')
})
