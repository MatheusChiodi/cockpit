import { expect, test } from 'claude-code/testing'

type Call = { tool: string; input: Record<string, string> }

const ASKED: readonly Call[] = [
  { tool: 'Edit', input: { file_path: 'src/a.ts', old_string: '', new_string: 'const result = eval(userInput)' } },
  { tool: 'Edit', input: { file_path: 'src/a.ts', old_string: '', new_string: 'const run = new Function(\'a\', body)' } },
  { tool: 'Edit', input: { file_path: 'src/view.ts', old_string: '', new_string: 'el.innerHTML = html' } },
  { tool: 'Edit', input: { file_path: 'src/View.tsx', old_string: '', new_string: '<div dangerouslySetInnerHTML={{ __html: html }} />' } },
  { tool: 'Edit', input: { file_path: 'src/git.ts', old_string: '', new_string: 'execSync(`git log ${branch}`)' } },
  { tool: 'Write', input: { file_path: 'src/Run.java', content: 'Runtime.getRuntime().exec("ls " + dir);' } },
]

const FINE: readonly Call[] = [
  { tool: 'Edit', input: { file_path: 'src/a.ts', old_string: '', new_string: 'const result = evaluate(userInput)' } },
  { tool: 'Edit', input: { file_path: 'src/a.ts', old_string: '', new_string: 'await page.evaluate(() => document.title)' } },
  { tool: 'Edit', input: { file_path: 'src/a.ts', old_string: '', new_string: 'const v = await page.$eval(selector, node => node.id)' } },
  { tool: 'Edit', input: { file_path: 'src/view.ts', old_string: '', new_string: 'el.innerHTML = \'\'' } },
  { tool: 'Edit', input: { file_path: 'src/view.ts', old_string: '', new_string: 'el.textContent = text' } },
  { tool: 'Edit', input: { file_path: 'src/View.tsx', old_string: '', new_string: '<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }} />' } },
  { tool: 'Edit', input: { file_path: 'src/git.ts', old_string: '', new_string: 'execSync(\'git status\')' } },
  { tool: 'Edit', input: { file_path: 'src/parse.ts', old_string: '', new_string: 'const match = pattern.exec(text)' } },
  { tool: 'Edit', input: { file_path: 'src/a.ts', old_string: '', new_string: '// eval( is banned here' } },
  { tool: 'Write', input: { file_path: 'src/Run.java', content: 'Runtime.getRuntime().exec(new String[]{"ls"});' } },
]

test('asks before what it exists to catch', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))

  for (const { tool, input } of ASKED) {
    const verdict = await $.tool.check({ tool, input })
    expect(verdict.decision, JSON.stringify(input)).toBe('ask')
    expect(verdict.reason, JSON.stringify(input)).toContain('dynamic-exec-guard:')
  }
})

test('lets similar but legitimate work through', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))

  for (const { tool, input } of FINE) {
    const verdict = await $.tool.check({ tool, input })
    expect(verdict.decision, JSON.stringify(input)).toBe('allow')
  }
})

test('counts only what the edit adds', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))

  const verdict = await $.tool.check({
    tool: 'Edit',
    input: { file_path: 'src/a.ts', old_string: 'const result = eval(userInput)', new_string: 'const result = eval(userInput)\nconst done = true' },
  })
  expect(verdict.decision).toBe('allow')
})

test('does not loosen a verdict that is already a deny', async ($, on) => {
  on('tool.check', () => ({ decision: 'deny', reason: 'blocked beneath' }))

  const { tool, input } = ASKED[0] as Call
  const verdict = await $.tool.check({ tool, input })
  expect(verdict.decision).toBe('deny')
})

test('speaks the language set in the hub', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))
  // Stands in for the hub: answers the language it would hold.
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  const { tool, input } = ASKED[0] as Call
  const verdict = await $.tool.check({ tool, input })
  expect(verdict.decision).toBe('ask')
  expect(verdict.reason).toContain('ou new Function em src/a.ts')
})
