import { expect, test } from 'claude-code/testing'

const ASKED = [
  'vercel --prod',
  'terraform apply',
  'kubectl delete pod web-1',
  'npm publish',
  'eas build --platform ios --profile production',
  'NODE_ENV=production node server.js',
]

const FINE = ['npm run build', 'terraform plan', 'kubectl get pods', 'vercel dev', 'git status']

test('asks before production actions and leaves the rest allowed', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))

  for (const command of ASKED) {
    const verdict = await $.tool.check({ tool: 'Bash', input: { command } })
    expect(verdict.decision, command).toBe('ask')
    expect(verdict.reason, command).toContain('Confirm before running.')
  }

  for (const command of FINE) {
    const verdict = await $.tool.check({ tool: 'Bash', input: { command } })
    expect(verdict.decision, command).toBe('allow')
  }

  const powershell = await $.tool.check({ tool: 'PowerShell', input: { command: 'docker push app:1' } })
  expect(powershell.reason).toBe('prod-guard: docker push. Confirm before running.')
})

test('does not loosen a verdict that is already a deny', async ($, on) => {
  on('tool.check', () => ({ decision: 'deny', reason: 'blocked beneath' }))

  const verdict = await $.tool.check({ tool: 'Bash', input: { command: 'vercel --prod' } })
  expect(verdict.decision).toBe('deny')
})

test('speaks the language set in the hub', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))
  // Stands in for the hub: answers the language it would hold.
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  const verdict = await $.tool.check({ tool: 'Bash', input: { command: 'vercel --prod' } })
  expect(verdict.reason).toBe('prod-guard: deploy em produção. Confirme antes de rodar.')
})
