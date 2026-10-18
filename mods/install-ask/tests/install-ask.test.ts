import { expect, test } from 'claude-code/testing'

const ASKED = [
  'npm install left-pad',
  'npm i -D typescript',
  'pnpm add zod',
  'yarn add react',
  'pip install requests',
  'cargo add serde',
  'npx expo install expo-camera',
]

const FINE = ['npm install', 'npm ci', 'npm run build', 'pip install -e .', 'git status']

test('asks before adding a dependency and leaves the rest allowed', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))

  for (const command of ASKED) {
    const verdict = await $.tool.check({ tool: 'Bash', input: { command } })
    expect(verdict.decision, command).toBe('ask')
    expect(verdict.reason, command).toBe('install-ask: the command adds a new dependency. Confirm.')
  }

  for (const command of FINE) {
    const verdict = await $.tool.check({ tool: 'Bash', input: { command } })
    expect(verdict.decision, command).toBe('allow')
  }
})

test('does not loosen a verdict that is already a deny', async ($, on) => {
  on('tool.check', () => ({ decision: 'deny', reason: 'blocked beneath' }))

  const verdict = await $.tool.check({ tool: 'Bash', input: { command: 'npm install left-pad' } })
  expect(verdict.decision).toBe('deny')
})

test('speaks the language set in the hub', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))
  // Stands in for the hub: answers the language it would hold.
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  const verdict = await $.tool.check({ tool: 'Bash', input: { command: 'npm install left-pad' } })
  expect(verdict.reason).toBe('install-ask: o comando adiciona uma dependência nova. Confirme.')
})

test('asks for the other package managers it knows', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))

  const commands = [
    'bun add hono',
    'go get github.com/x/y',
    'gem install rails',
    'composer require monolog/monolog',
    'dotnet add package Serilog',
    'npm install --save-dev @types/node',
    'pip3 install flask',
  ]

  for (const command of commands) {
    const verdict = await $.tool.check({ tool: 'Bash', input: { command } })
    expect(verdict.decision, command).toBe('ask')
  }
})

test('leaves requirement files and plain installs allowed', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))

  for (const command of ['pip install .', 'npm i', 'yarn', 'pnpm install']) {
    const verdict = await $.tool.check({ tool: 'Bash', input: { command } })
    expect(verdict.decision, command).toBe('allow')
  }
})

test('asks in PowerShell too, but not for other tools or a missing command', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))

  const shell = await $.tool.check({ tool: 'PowerShell', input: { command: 'npm install left-pad' } })
  expect(shell.decision).toBe('ask')

  const other = await $.tool.check({ tool: 'Write', input: { file_path: 'a.md', content: 'npm install left-pad' } })
  expect(other.decision).toBe('allow')

  const empty = await $.tool.check({ tool: 'Bash', input: {} })
  expect(empty.decision).toBe('allow')
})

test('keeps an ask from beneath with its own reason', async ($, on) => {
  on('tool.check', () => ({ decision: 'ask', reason: 'asked beneath' }))

  const verdict = await $.tool.check({ tool: 'Bash', input: { command: 'npm install left-pad' } })
  expect(verdict.decision).toBe('ask')
  expect(verdict.reason).toBe('asked beneath')
})

test('speaks Spanish when the hub language is es', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  const verdict = await $.tool.check({ tool: 'Bash', input: { command: 'yarn add react' } })
  expect(verdict.reason).toBe('install-ask: el comando agrega una dependencia nueva. Confirma.')
})
