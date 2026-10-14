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
