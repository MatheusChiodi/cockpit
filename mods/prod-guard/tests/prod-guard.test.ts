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

test('names what each production action is', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))
  const NAMED: readonly (readonly [string, string])[] = [
    ['netlify deploy --dir dist --prod', 'production deploy'],
    ['firebase deploy --only hosting', 'firebase deploy'],
    ['terraform destroy -auto-approve', 'terraform apply/destroy'],
    ['kubectl rollout restart deploy/web', 'change to a Kubernetes cluster'],
    ['eas submit -p ios', 'publishing through EAS'],
    ['pnpm publish --access public', 'package publish'],
    ['gh release create v1.0.0', 'release creation'],
    ['npx prisma migrate deploy', 'database migration'],
    ['APP_ENV=prod ./run.sh', 'command with a production environment'],
  ]

  for (const [command, what] of NAMED) {
    const verdict = await $.tool.check({ tool: 'Bash', input: { command } })
    expect(verdict.reason, command).toBe(`prod-guard: ${what}. Confirm before running.`)
  }
})

test('a --prod flag after a pipe does not count as a deploy', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))

  for (const command of ['vercel ls | grep --prod', 'eas build --profile preview', 'prisma migrate dev', 'ENV=staging npm start']) {
    const verdict = await $.tool.check({ tool: 'Bash', input: { command } })
    expect(verdict.decision, command).toBe('allow')
  }
})

test('leaves other tools and inputs without a command alone', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))

  expect((await $.tool.check({ tool: 'Write', input: { command: 'vercel --prod', file_path: 'a' } })).decision).toBe('allow')
  expect((await $.tool.check({ tool: 'Bash', input: {} })).decision).toBe('allow')
  expect((await $.tool.check({ tool: 'Bash', input: null })).decision).toBe('allow')
})

test('keeps an ask from beneath as it was', async ($, on) => {
  on('tool.check', () => ({ decision: 'ask', reason: 'asked beneath' }))

  const verdict = await $.tool.check({ tool: 'Bash', input: { command: 'npm publish' } })
  expect(verdict).toEqual({ decision: 'ask', reason: 'asked beneath' })
})

test('asks with a clear reason when the check throws', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ deny: 'state down' }))

  const verdict = await $.tool.check({ tool: 'Bash', input: { command: 'npm publish' } })
  expect(verdict).toEqual({ decision: 'ask', reason: 'prod-guard: the check failed, confirm manually.' })
})

test('speaks Spanish when the hub is set to es', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  const verdict = await $.tool.check({ tool: 'PowerShell', input: { command: 'kubectl apply -f k8s/' } })
  expect(verdict.reason).toBe('prod-guard: cambio en un clúster de Kubernetes. Confirma antes de ejecutar.')
})
