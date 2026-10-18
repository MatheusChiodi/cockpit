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

test('speaks Spanish when the hub is set to es', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  const verdict = await $.tool.check({ tool: 'Write', input: { file_path: 'a.ts', content: 'const x = y as any' } })
  expect(verdict.reason).toBe('any-guard: la edición añade "as any", lo que desactiva la comprobación de tipos. Confirma antes de ejecutar.')
})

test('covers .mts, .cts and upper-case extensions, and generic any', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))

  for (const [file_path, content, what] of [
    ['lib/a.mts', 'export const x: any = 1', '": any"'],
    ['lib/a.cts', 'const list: Array<any> = []', '"<any>"'],
    ['lib/A.TS', 'let rows: any[] = []', '": any"'],
  ] as const) {
    const verdict = await $.tool.check({ tool: 'Write', input: { file_path, content } })
    expect(verdict.reason, file_path).toContain(`adds ${what}`)
  }
})

test('counts occurrences: one more any than before is asked about', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))

  const verdict = await $.tool.check({
    tool: 'Edit',
    input: { file_path: 'a.ts', old_string: 'let a: any = 1', new_string: 'let a: any = 1\nlet b: any = 2' },
  })
  expect(verdict.decision).toBe('ask')

  const removed = await $.tool.check({
    tool: 'Edit',
    input: { file_path: 'a.ts', old_string: 'let a: any = 1\nlet b: any = 2', new_string: 'let a: any = 1' },
  })
  expect(removed.decision).toBe('allow')
})

test('leaves words that only start with any, and object keys named any', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))

  for (const content of ['const anyway = 1', 'type T = { kind: anything }', 'const many = []']) {
    expect((await $.tool.check({ tool: 'Write', input: { file_path: 'a.ts', content } })).decision, content).toBe('allow')
  }
})

test('keeps a verdict that already asks', async ($, on) => {
  on('tool.check', () => ({ decision: 'ask', reason: 'beneath' }))

  const verdict = await $.tool.check({ tool: 'Write', input: { file_path: 'a.ts', content: 'let a: any' } })
  expect(verdict.reason).toBe('beneath')
})
