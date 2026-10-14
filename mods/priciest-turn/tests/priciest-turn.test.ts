import { expect, test } from 'claude-code/testing'
import type { On } from 'claude-code'

const cmd = { command: 'priciest', args: '', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 80 } } as const

const measure = (usd: number) => ({ context: { window: 200000 }, rateLimits: [], cost: { usd }, changed: ['cost' as const] })

const world = (on: On) => {
  on('session.measure', (_$, e) => ({ changed: e.changed }))
  on('turn.start', (_$, e) => ({ turnId: e.turnId }))
  on('tool.call', { tool: 'Read' }, () => ({ result: undefined as never }))
  on('tool.call', { tool: 'Bash' }, () => ({ result: { stdout: '', stderr: '', interrupted: false } }))
}

test('names the most expensive turn and what it did', async ($, on) => {
  world(on)

  await $.turn.start({ text: 'rename a variable', turnId: 't1' })
  await $.session.measure(measure(0.1))

  await $.turn.start({ text: 'migrate   the\nbilling module', turnId: 't2' })
  await $.tool.call({ tool: 'Read', file_path: '/a', tool_use_id: 'a' })
  await $.tool.call({ tool: 'Read', file_path: '/b', tool_use_id: 'b' })
  await $.tool.call({ tool: 'Bash', command: 'npm test', tool_use_id: 'c' })
  await $.session.measure(measure(0.5))
  await $.session.measure(measure(0.9))

  expect((await $.command.run(cmd)).text).toBe(
    ['Priciest turn: #2  US$ 0.80  (89% of the session)', 'Asked: migrate the billing module', 'Tools: Read×2  Bash×1'].join('\n'),
  )
})

test('says so when no cost was recorded', async ($, on) => {
  world(on)

  expect((await $.command.run(cmd)).text).toBe('No cost recorded yet this session.')
  await $.turn.start({ text: 'free', turnId: 't1' })
  expect((await $.command.run(cmd)).text).toBe('No cost recorded yet this session.')
})

test('speaks the language set in the hub', async ($, on) => {
  world(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  await $.turn.start({ text: '', turnId: 't1' })
  await $.session.measure(measure(1))
  expect((await $.command.run(cmd)).text).toBe(
    ['Turno mais caro: #1  US$ 1.00  (100% da sessão)', 'Pedido: (sem prompt digitado)', 'Ferramentas: nenhuma'].join('\n'),
  )
})
