import { expect, test } from 'claude-code/testing'
import type { On } from 'claude-code'

const spawn = (description: string, model?: string) =>
  ({
    tool_use_id: 'tu',
    prompt: description,
    description,
    subagentType: 'Explore',
    provider: { plugin: 'engine', tier: 'core' },
    parentModel: 'claude-opus-5-5',
    background: false,
    fork: false,
    ...(model === undefined ? {} : { model }),
  }) as const

const cmd = { command: 'agentmodels', args: '', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 80 } } as const

// The world beneath the mod: every subagent resolves to Haiku, and every toast is recorded.
const world = (on: On, toasts: string[], model = 'claude-haiku-5-5') => {
  on('agent.spawn', () => ({ model, agentId: 'a1' }))
  on('ui.toast', (_$, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })
}

test('notes the model of each subagent and toasts when it differs from the main one', async ($, on) => {
  const toasts: string[] = []
  world(on, toasts)

  await $.agent.spawn(spawn('map the auth flow'))
  expect(toasts).toEqual(['Subagent "map the auth flow" runs on claude-haiku-5-5 (main: claude-opus-5-5)'])
  expect((await $.command.run(cmd)).text).toBe('claude-haiku-5-5  map the auth flow')
})

test('stays silent when the subagent runs on the main model', async ($, on) => {
  const toasts: string[] = []
  world(on, toasts, 'claude-opus-5-5')

  await $.agent.spawn(spawn('same model'))
  expect(toasts).toEqual([])
})

test('speaks the language set in the hub', async ($, on) => {
  const toasts: string[] = []
  world(on, toasts)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  await $.agent.spawn(spawn('mapear'))
  expect(toasts).toEqual(['Subagente "mapear" roda em claude-haiku-5-5 (principal: claude-opus-5-5)'])
})

test('says so when no subagent was spawned', async ($, on) => {
  world(on, [])

  expect((await $.command.run(cmd)).text).toBe('No subagent spawned in this session.')
})

test('does not note a spawn that was refused', async ($, on) => {
  const toasts: string[] = []
  on('agent.spawn', () => ({ deny: 'no agents here' }))
  on('ui.toast', (_$, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })

  const started = await $.agent.spawn(spawn('refused one'))
  expect(started.deny).toBe('no agents here')
  expect(toasts).toEqual([])
  expect((await $.command.run(cmd)).text).toBe('No subagent spawned in this session.')
})

test('lists every subagent in order, the same-model ones too, with the description cut to 40', async ($, on) => {
  const toasts: string[] = []
  let model = 'claude-opus-5-5'
  on('agent.spawn', () => ({ model, agentId: 'a1' }))
  on('ui.toast', (_$, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })

  await $.agent.spawn(spawn('first on main'))
  model = 'claude-haiku-5-5'
  await $.agent.spawn(spawn(`${'d'.repeat(40)}TAIL`))

  expect((await $.command.run(cmd)).text).toBe(`claude-opus-5-5  first on main\nclaude-haiku-5-5  ${'d'.repeat(40)}`)
  expect(toasts).toEqual([`Subagent "${'d'.repeat(40)}" runs on claude-haiku-5-5 (main: claude-opus-5-5)`])
})

test('speaks Spanish, and Portuguese for the empty list', async ($, on) => {
  const toasts: string[] = []
  world(on, toasts)
  let lang = 'pt'
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: lang, version: 1 } }))

  expect((await $.command.run(cmd)).text).toBe('Nenhum subagente iniciado nesta sessão.')
  lang = 'es'
  expect((await $.command.run(cmd)).text).toBe('Ningún subagente iniciado en esta sesión.')
  await $.agent.spawn(spawn('mapear'))
  expect(toasts).toEqual(['Subagente "mapear" corre en claude-haiku-5-5 (principal: claude-opus-5-5)'])
})
