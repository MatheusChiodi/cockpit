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

test('names what each destructive command does', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))
  const NAMED: readonly (readonly [string, string])[] = [
    ['docker system prune --volumes', 'removes unused Docker data (system prune)'],
    ['docker volume remove cache', 'removes Docker volumes and their data'],
    ['docker rm -vf web', 'force-removes containers (rm -f)'],
    ['docker rmi --force app:old', 'force-removes images (rmi -f)'],
    ['docker compose -f prod.yml down -v', 'tears down a compose project and deletes its volumes (down -v)'],
  ]

  for (const [command, what] of NAMED) {
    const verdict = await $.tool.check({ tool: 'Bash', input: { command } })
    expect(verdict.reason, command).toBe(`docker-guard: ${what}. Confirm before running.`)
  }
})

test('a flag after a pipe or in another command does not count', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))

  for (const command of ['docker rm web | grep -f x', 'docker compose down; ls -v', 'docker rmi app && rm -f tmp.txt']) {
    expect((await $.tool.check({ tool: 'Bash', input: { command } })).decision, command).toBe('allow')
  }
})

test('leaves other tools and inputs without a command alone', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))

  expect((await $.tool.check({ tool: 'Write', input: { command: 'docker system prune' } })).decision).toBe('allow')
  expect((await $.tool.check({ tool: 'Bash', input: { cmd: 'docker system prune' } })).decision).toBe('allow')
})

test('asks with a clear reason when the check fails', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ deny: 'state down' }))

  expect(await $.tool.check({ tool: 'Bash', input: { command: 'docker volume prune' } })).toEqual({
    decision: 'ask',
    reason: 'docker-guard: the check failed, confirm manually.',
  })
})

test('speaks Spanish when the hub is set to es', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  const verdict = await $.tool.check({ tool: 'Bash', input: { command: 'docker compose down -v' } })
  expect(verdict.reason).toBe('docker-guard: baja un proyecto compose y borra sus volúmenes (down -v). Confirma antes de ejecutar.')
})
