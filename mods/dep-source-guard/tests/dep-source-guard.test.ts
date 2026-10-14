import { expect, test } from 'claude-code/testing'

type Call = { tool: string; input: Record<string, string> }

const ASKED: readonly Call[] = [
  { tool: 'Edit', input: { file_path: 'package.json', old_string: '', new_string: '    "left-pad": "git+https://github.com/someone/left-pad.git#main",' } },
  { tool: 'Edit', input: { file_path: 'package.json', old_string: '', new_string: '    "ui-kit": "http://cdn.example.com/ui-kit-1.2.0.tgz",' } },
  { tool: 'Write', input: { file_path: 'requirements.txt', content: 'git+https://github.com/org/lib.git@main#egg=lib' } },
  { tool: 'Bash', input: { command: 'npm install github:someone/fork' } },
  { tool: 'Bash', input: { command: 'pip install https://example.com/pkg-1.0.tar.gz' } },
  { tool: 'Bash', input: { command: 'npm i http://example.com/lib.tgz' } },
]

const FINE: readonly Call[] = [
  { tool: 'Edit', input: { file_path: 'package.json', old_string: '', new_string: '    "react": "^18.2.0",' } },
  { tool: 'Edit', input: { file_path: 'package.json', old_string: '', new_string: '  "homepage": "http://example.com",' } },
  { tool: 'Edit', input: { file_path: 'package.json', old_string: '', new_string: '  "repository": "git+https://github.com/me/app.git",' } },
  { tool: 'Edit', input: { file_path: 'package.json', old_string: '', new_string: '    "url": "git+https://github.com/me/app.git"' } },
  { tool: 'Write', input: { file_path: 'requirements.txt', content: 'requests==2.31.0' } },
  { tool: 'Edit', input: { file_path: 'src/a.ts', old_string: '', new_string: '"x": "git+https://github.com/me/x.git"' } },
  { tool: 'Bash', input: { command: 'npm install react' } },
  { tool: 'Bash', input: { command: 'pip install -r requirements.txt' } },
  { tool: 'Bash', input: { command: 'npm install --save-dev vitest' } },
  { tool: 'Bash', input: { command: 'pnpm add http://localhost:4873/pkg.tgz' } },
]

test('asks before what it exists to catch', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))

  for (const { tool, input } of ASKED) {
    const verdict = await $.tool.check({ tool, input })
    expect(verdict.decision, JSON.stringify(input)).toBe('ask')
    expect(verdict.reason, JSON.stringify(input)).toContain('dep-source-guard:')
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
    input: { file_path: 'package.json', old_string: '    "left-pad": "git+https://github.com/someone/left-pad.git#main",', new_string: '    "left-pad": "git+https://github.com/someone/left-pad.git#main",\n    "react": "^18.2.0",' },
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
  expect(verdict.reason).toContain('fixa uma dependência em uma URL git ou tarball (package.json)')
})
