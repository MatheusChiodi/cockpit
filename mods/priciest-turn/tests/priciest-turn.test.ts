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

test('speaks Spanish when the hub is set to es', async ($, on) => {
  world(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  expect((await $.command.run(cmd)).text).toBe('Aún no hay costo registrado en esta sesión.')

  await $.turn.start({ text: 'fix it', turnId: 't1' })
  await $.session.measure(measure(0.5))
  expect((await $.command.run(cmd)).text).toBe(
    ['Turno más caro: #1  US$ 0.50  (100% de la sesión)', 'Pedido: fix it', 'Herramientas: ninguna'].join('\n'),
  )
})

test('cuts the prompt at 80 characters', async ($, on) => {
  world(on)

  await $.turn.start({ text: `${'a'.repeat(80)}TAIL`, turnId: 't1' })
  await $.session.measure(measure(0.2))
  expect((await $.command.run(cmd)).text?.split('\n')[1]).toBe(`Asked: ${'a'.repeat(80)}`)
})

test('a total that goes down adds nothing to the turn', async ($, on) => {
  world(on)

  await $.turn.start({ text: 'one', turnId: 't1' })
  await $.session.measure(measure(1))
  await $.turn.start({ text: 'two', turnId: 't2' })
  await $.session.measure(measure(0.4))
  await $.session.measure(measure(0.6))

  // The share never passes 100%, even when the session total fell below the turn's cost.
  expect((await $.command.run(cmd)).text?.split('\n')[0]).toBe('Priciest turn: #1  US$ 1.00  (100% of the session)')
})

test('ignores measures without cost and calls made before any turn', async ($, on) => {
  world(on)

  await $.tool.call({ tool: 'Read', file_path: '/early', tool_use_id: 'early' })
  await $.turn.start({ text: 'look', turnId: 't1' })
  await $.session.measure({ context: { window: 200000 }, rateLimits: [], changed: ['context' as const] } as never)
  expect((await $.command.run(cmd)).text).toBe('No cost recorded yet this session.')

  await $.session.measure(measure(0.3))
  expect((await $.command.run(cmd)).text?.split('\n')[2]).toBe('Tools: none')
})

test('on a tie the earlier turn stands, and tools are ordered by count', async ($, on) => {
  world(on)

  await $.turn.start({ text: 'first', turnId: 't1' })
  await $.tool.call({ tool: 'Bash', command: 'ls', tool_use_id: 'x' })
  await $.tool.call({ tool: 'Read', file_path: '/a', tool_use_id: 'y' })
  await $.tool.call({ tool: 'Read', file_path: '/b', tool_use_id: 'z' })
  await $.session.measure(measure(0.5))
  await $.turn.start({ text: 'second', turnId: 't2' })
  await $.session.measure(measure(1))

  const lines = (await $.command.run(cmd)).text?.split('\n')
  expect(lines?.[0]).toBe('Priciest turn: #1  US$ 0.50  (50% of the session)')
  expect(lines?.[2]).toBe('Tools: Read×2  Bash×1')
})
