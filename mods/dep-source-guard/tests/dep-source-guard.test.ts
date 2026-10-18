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

test('speaks Spanish when the hub is set to es', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  const verdict = await $.tool.check({ tool: 'Bash', input: { command: 'npm i http://example.com/lib.tgz' } })
  expect(verdict.reason).toBe(
    'dep-source-guard: descarga una dependencia por http plano (npm i http://example.com/lib.tgz). La descarga puede ser alterada en tránsito; usa una fuente https.',
  )
})

test('covers Cargo git dependencies, pip editable installs and PowerShell', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))

  const cargo = await $.tool.check({
    tool: 'Edit',
    input: { file_path: 'Cargo.toml', old_string: '', new_string: 'serde = { git = "https://github.com/serde-rs/serde" }' },
  })
  expect(cargo.reason).toContain('pins a dependency to a git URL or tarball (Cargo.toml)')

  const pip = await $.tool.check({ tool: 'Bash', input: { command: 'pip3 install -e git+https://github.com/org/lib.git#egg=lib' } })
  expect(pip.decision).toBe('ask')

  const ps = await $.tool.check({ tool: 'PowerShell', input: { command: 'yarn add git@github.com:me/x.git' } })
  expect(ps.decision).toBe('ask')
})

test('skips comments and homepage lines in Python and Rust manifests', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))

  for (const [file_path, content] of [
    ['requirements.txt', '# git+https://github.com/org/lib.git'],
    ['pyproject.toml', 'homepage = "http://example.com"'],
    ['Cargo.toml', 'repository = "https://github.com/me/crate"'],
  ] as const) {
    expect((await $.tool.check({ tool: 'Write', input: { file_path, content } })).decision, content).toBe('allow')
  }
})

test('names at most 60 characters of the command', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))
  const command = `npm install github:someone/${'x'.repeat(80)}`

  const verdict = await $.tool.check({ tool: 'Bash', input: { command } })
  expect(verdict.reason).toContain(`(${command.slice(0, 60)})`)
  expect(verdict.reason).not.toContain(command)
})

test('leaves other tools and an existing ask untouched', async ($, on) => {
  on('tool.check', () => ({ decision: 'ask', reason: 'asked beneath' }))

  const read = await $.tool.check({ tool: 'Read', input: { file_path: 'package.json' } })
  expect(read).toMatchObject({ decision: 'ask', reason: 'asked beneath' })

  const { tool, input } = ASKED[0] as Call
  expect(await $.tool.check({ tool, input })).toMatchObject({ decision: 'ask', reason: 'asked beneath' })
})

test('asks with the failure text when the check itself fails', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ deny: 'state unavailable' }))

  const { tool, input } = ASKED[0] as Call
  const verdict = await $.tool.check({ tool, input })
  expect(verdict).toMatchObject({ decision: 'ask', reason: 'dep-source-guard: the check failed, confirm before continuing.' })
})
