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

test('reports the cap in force, or that there is none', async $ => {
  expect((await $.command.run(cmd(''))).text).toBe('No subagent cap. Set one with /agentcap <n>.')
  await $.command.run(cmd('4'))
  expect((await $.command.run(cmd('  '))).text).toBe('Subagent cap: 4 at once.')
  await $.command.run(cmd('off'))
  expect((await $.command.run(cmd(''))).text).toBe('No subagent cap. Set one with /agentcap <n>.')
})

test('refuses a cap below one or not whole, keeping the previous one', async $ => {
  await $.command.run(cmd('2'))

  for (const bad of ['0', '-1', '1.5', 'two']) {
    expect((await $.command.run(cmd(bad))).text, bad).toBe('Usage: /agentcap <n> | off')
  }

  expect((await $.command.run(cmd(''))).text).toBe('Subagent cap: 2 at once.')
})

test('counts pending subagents and guards the Task tool too', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))
  on('agent.list', () => ({ value: [agent('a1', 'pending'), agent('a2', 'failed'), agent('a3', 'killed')] }))

  await $.command.run(cmd('1'))
  const asked = await $.tool.check({ tool: 'Task', input: {} })
  expect(asked.decision).toBe('ask')
  expect(asked.reason).toBe('agent-cap: 1 subagents already running (cap 1). Start another?')
})

test('leaves a deny from beneath alone and allows when the list cannot be read', async ($, on) => {
  let verdict: any = { decision: 'deny', reason: 'blocked beneath' }
  on('tool.check', () => verdict)
  on('agent.list', () => ({ deny: 'unavailable' }))

  await $.command.run(cmd('1'))
  expect(await $.tool.check({ tool: 'Agent', input: {} })).toEqual({ decision: 'deny', reason: 'blocked beneath' })

  verdict = { decision: 'allow' }
  expect((await $.tool.check({ tool: 'Agent', input: {} })).decision).toBe('allow')
})

test('speaks Spanish when the hub is set to es', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))
  on('agent.list', () => ({ value: [agent('a1', 'running'), agent('a2', 'running')] }))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  expect((await $.command.run(cmd('2'))).text).toBe('Límite de subagentes definido en 2.')
  expect((await $.tool.check({ tool: 'Agent', input: {} })).reason).toBe(
    'agent-cap: ya hay 2 subagentes en marcha (límite 2). ¿Iniciar otro?',
  )
  expect((await $.command.run(cmd('off'))).text).toBe('Límite de subagentes quitado.')
})
