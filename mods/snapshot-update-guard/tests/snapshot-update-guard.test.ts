import { expect, test } from 'claude-code/testing'

const ASKED = [
  'npx jest -u',
  'jest --updateSnapshot src/cart',
  'vitest run -u',
  'vitest --update',
  'npm test -- -u',
  'pnpm run test --updateSnapshot',
  'pytest --snapshot-update',
  'npx playwright test --update-snapshots',
  'cargo insta accept',
  'INSTA_UPDATE=always cargo test',
  'go test ./... -update',
]

const FINE = ['npx jest', 'vitest run', 'npm test', 'npm install -u', 'git status', 'pytest -q', 'ls -u']

test('asks before a command rewrites snapshots', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))

  for (const command of ASKED) {
    const verdict = await $.tool.check({ tool: 'Bash', input: { command } })
    expect(verdict.decision, command).toBe('ask')
    expect(verdict.reason, command).toContain('Confirm before running.')
  }

  const powershell = await $.tool.check({ tool: 'PowerShell', input: { command: 'npx jest -u' } })
  expect(powershell.decision).toBe('ask')
})

test('leaves ordinary commands allowed and keeps a denial beneath it', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))

  for (const command of FINE) {
    const verdict = await $.tool.check({ tool: 'Bash', input: { command } })
    expect(verdict.decision, command).toBe('allow')
  }
})

test('keeps a denial beneath it', async ($, on) => {
  on('tool.check', () => ({ decision: 'deny', reason: 'no' }))

  const verdict = await $.tool.check({ tool: 'Bash', input: { command: 'npx jest -u' } })
  expect(verdict.decision).toBe('deny')
})

test('speaks the language set in the hub', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  const verdict = await $.tool.check({ tool: 'Bash', input: { command: 'npx jest -u' } })
  expect(verdict.reason).toContain('reescreve os snapshots esperados')
})
