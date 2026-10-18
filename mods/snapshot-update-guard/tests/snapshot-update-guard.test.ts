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

test('speaks Spanish when the hub is set to es', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  const verdict = await $.tool.check({ tool: 'Bash', input: { command: 'vitest -u' } })
  expect(verdict).toEqual({
    decision: 'ask',
    reason: 'snapshot-update-guard: reescribe los snapshots esperados, lo que puede aprobar una regresión. Confirma antes de ejecutar.',
  })
})

test('asks for more snapshot runners and for an update later in a chain', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))

  for (const command of [
    'cargo insta review',
    'INSTA_UPDATE=new cargo test',
    'UPDATE_SNAPSHOTS=1 npm test',
    'UPDATE_SNAPSHOT=true node run.js',
    'yarn test --update',
    'bun test -u',
    'npm ci && npx jest --updateSnapshot',
  ]) {
    expect((await $.tool.check({ tool: 'Bash', input: { command } })).decision, command).toBe('ask')
  }
})

test('does not read a flag of another command in the chain as an update', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))

  for (const command of ['npx jest; ls -u', 'npm test | sort -u', 'npm run testing -u', 'go test ./... -run Update']) {
    expect((await $.tool.check({ tool: 'Bash', input: { command } })).decision, command).toBe('allow')
  }
})

test('leaves other tools and inputs without a command alone', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))

  expect((await $.tool.check({ tool: 'Write', input: { file_path: 'x.sh', content: 'npx jest -u' } })).decision).toBe('allow')
  expect((await $.tool.check({ tool: 'Bash', input: {} })).decision).toBe('allow')
})
