import { expect, test } from 'claude-code/testing'
import type { On } from 'claude-code'

const spawn = (description: string, prompt = description) =>
  ({
    tool_use_id: 'tu',
    prompt,
    description,
    subagentType: 'Explore',
    provider: { plugin: 'engine', tier: 'core' },
    parentModel: 'claude-opus-5-5',
    background: false,
    fork: false,
  }) as const

const world = (on: On, toasts: string[]) => {
  on('agent.spawn', () => ({ model: 'claude-haiku-5-5', agentId: 'a1' }))
  on('ui.toast', (_$, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })
}

test('notes a subagent whose task is one tool call', async ($, on) => {
  const toasts: string[] = []
  world(on, toasts)

  await $.agent.spawn(spawn('read package.json', 'Read package.json and tell me the version'))
  await $.agent.spawn(spawn('run the tests', 'Run npm test and report the output'))
  expect(toasts).toHaveLength(2)
  expect(toasts[0]).toBe('Subagent "read package.json" looks like one tool call: a spawn costs a fresh context and a full report')
})

test('stays silent for real work, long prompts and forks', async ($, on) => {
  const toasts: string[] = []
  world(on, toasts)

  await $.agent.spawn(spawn('auth flow', 'Read the auth module and then map every caller of the session helper'))
  await $.agent.spawn(spawn('big', `Read ${'the config and explain it '.repeat(10)}`))
  await $.agent.spawn(spawn('multi', 'Read the file\nthen summarise'))
  await $.agent.spawn({ ...spawn('fork', 'Read package.json'), fork: true })
  await $.agent.spawn(spawn('investigate', 'Investigate why the build fails'))
  expect(toasts).toEqual([])
})

test('speaks the language set in the hub', async ($, on) => {
  const toasts: string[] = []
  world(on, toasts)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  await $.agent.spawn(spawn('ler config', 'Read config.json'))
  expect(toasts[0]).toContain('parece uma só chamada de ferramenta')
})

test('teammates and workflow spawns are left alone', async ($, on) => {
  const toasts: string[] = []
  world(on, toasts)

  await $.agent.spawn({ ...spawn('read a', 'Read a.ts'), isTeammate: true } as never)
  await $.agent.spawn({ ...spawn('read b', 'Read b.ts'), workflow: { name: 'w' } } as never)
  expect(toasts).toEqual([])
})

test('the spawn goes ahead and its answer comes back untouched', async ($, on) => {
  const toasts: string[] = []
  world(on, toasts)

  const answer = await $.agent.spawn(spawn('cat file', 'cat README.md'))
  expect(answer).toEqual({ model: 'claude-haiku-5-5', agentId: 'a1' })
  expect(toasts).toHaveLength(1)
})

test('falls back to the prompt and cuts the name at 40 characters', async ($, on) => {
  const toasts: string[] = []
  world(on, toasts)

  await $.agent.spawn(spawn('', `Show ${'x'.repeat(60)}`))
  expect(toasts[0]).toBe(`Subagent "Show ${'x'.repeat(35)}" looks like one tool call: a spawn costs a fresh context and a full report`)
})

test('check whether and get the output count as one call, fix does not', async ($, on) => {
  const toasts: string[] = []
  world(on, toasts)

  await $.agent.spawn(spawn('check', 'Check whether port 3000 is free'))
  await $.agent.spawn(spawn('output', 'Get the output of git log -1'))
  await $.agent.spawn(spawn('fix', 'Run the linter and fix what it reports'))
  expect(toasts).toHaveLength(2)
})

test('speaks Spanish from the hub', async ($, on) => {
  const toasts: string[] = []
  world(on, toasts)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  await $.agent.spawn(spawn('ver log', 'View the log'))
  expect(toasts[0]).toBe('El subagente "ver log" parece una sola llamada de herramienta: iniciar uno cuesta un contexto nuevo y un informe completo')
})
