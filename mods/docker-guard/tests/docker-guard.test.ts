import { expect, test } from 'claude-code/testing'

const ASKED = [
  'docker system prune -af',
  'docker volume rm pgdata',
  'docker volume prune -f',
  'docker rm -f web',
  'docker container rm --force web',
  'docker rmi -f node:20',
  'docker image rm -f node:20',
  'docker compose down -v',
  'docker-compose down --remove-orphans --volumes',
  'cd app && docker compose down -v',
]

const PASSED = [
  'docker ps',
  'docker rm web',
  'docker rmi node:20',
  'docker compose down',
  'docker compose up -d',
  'docker volume ls',
  'docker build -f Dockerfile .',
  'docker logs --follow web',
]

test('asks before destructive Docker commands, in English by default', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))

  for (const command of ASKED) {
    const verdict = await $.tool.check({ tool: 'Bash', input: { command } })
    expect(verdict.decision, command).toBe('ask')
    expect(verdict.reason, command).toContain('docker-guard')
  }
})

test('lets everyday Docker commands through', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))

  for (const command of PASSED) {
    const verdict = await $.tool.check({ tool: 'Bash', input: { command } })
    expect(verdict.decision, command).toBe('allow')
  }
})

test('asks in PowerShell too and keeps a verdict that is already a denial', async ($, on) => {
  on('tool.check', ($, e) => ({ decision: e.tool === 'PowerShell' ? 'allow' : 'deny', reason: 'beneath' }))

  const asked = await $.tool.check({ tool: 'PowerShell', input: { command: 'docker system prune -a' } })
  expect(asked.decision).toBe('ask')

  const denied = await $.tool.check({ tool: 'Bash', input: { command: 'docker system prune -a' } })
  expect(denied.decision).toBe('deny')
})

test('speaks the language set in the hub', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))
  // Stands in for the hub: answers the language it would hold.
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  const verdict = await $.tool.check({ tool: 'Bash', input: { command: 'docker system prune' } })
  expect(verdict.reason).toContain('docker-guard: remove dados Docker não usados (system prune). Confirme antes de rodar.')
})
