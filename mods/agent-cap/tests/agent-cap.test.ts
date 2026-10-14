import { expect, test } from 'claude-code/testing'

const agent = (id: string, status: string, type = 'Explore') => ({ id, description: id, type, status }) as never

const cmd = (args: string) =>
  ({ command: 'agentcap', args, origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 80 } }) as const

test('asks for the subagent past the cap and allows below it', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))
  on('agent.list', () => ({ value: [agent('a1', 'running'), agent('a2', 'waiting'), agent('a3', 'completed')] }))

  expect((await $.command.run(cmd('2'))).text).toBe('Subagent cap set to 2.')
  const asked = await $.tool.check({ tool: 'Agent', input: {} })
  expect(asked.decision).toBe('ask')
  expect(asked.reason).toBe('agent-cap: 2 subagents already running (cap 2). Start another?')

  await $.command.run(cmd('3'))
  expect((await $.tool.check({ tool: 'Agent', input: {} })).decision).toBe('allow')
})

test('stays silent with no cap, for other tools and teammates', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))
  on('agent.list', () => ({ value: [agent('a1', 'running'), agent('t1', 'running', 'teammate')] }))

  expect((await $.tool.check({ tool: 'Agent', input: {} })).decision).toBe('allow')
  await $.command.run(cmd('1'))
  expect((await $.tool.check({ tool: 'Read', input: {} })).decision).toBe('allow')
  await $.command.run(cmd('2'))
  expect((await $.tool.check({ tool: 'Agent', input: {} })).decision).toBe('allow')
  expect((await $.command.run(cmd('off'))).text).toBe('Subagent cap removed.')
  expect((await $.command.run(cmd('x'))).text).toBe('Usage: /agentcap <n> | off')
})

test('speaks the language set in the hub', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))
  on('agent.list', () => ({ value: [agent('a1', 'running')] }))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  await $.command.run(cmd('1'))
  const asked = await $.tool.check({ tool: 'Agent', input: {} })
  expect(asked.reason).toBe('agent-cap: 1 subagentes já rodando (limite 1). Iniciar mais um?')
})
