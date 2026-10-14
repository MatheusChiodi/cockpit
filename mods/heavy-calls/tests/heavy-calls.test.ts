import { expect, test } from 'claude-code/testing'
import type { On } from 'claude-code'

const PT = { value: { value: 'pt', version: 1 } } as const

const run = () => ({
  command: 'heavy',
  args: '',
  origin: { kind: 'composer' } as const,
  presentation: { isFullscreen: true, columns: 120 },
})

// The world beneath the mod: a Bash whose output size follows the command, and a Read.
const world = (on: On) => {
  on('tool.call', { tool: 'Bash' }, (_$, e) => ({
    result: { stdout: 'x'.repeat(e.command.includes('big') ? 40_000 : 400), stderr: '', interrupted: false },
  }))
  on('tool.call', { tool: 'Read' }, () => ({ result: undefined as never }))
}

test('lists the heaviest results first, with tool, target and size', async ($, on) => {
  world(on)

  await $.tool.call({ tool: 'Bash', command: 'ls', tool_use_id: 'a' })
  await $.tool.call({ tool: 'Bash', command: 'cat big.log', tool_use_id: 'b' })
  await $.tool.call({ tool: 'Bash', command: 'git status', tool_use_id: 'c' })

  const text = (await $.command.run(run())).text ?? ''
  const rows = text.split('\n')

  expect(rows[0]).toMatch(/^Heaviest results \(about [\d,]+ tokens in 3 calls\)$/)
  expect(rows[1]).toMatch(/^ {2}1\. +\d[\d,]* tok {2}Bash +cat big\.log$/)
  expect(rows).toHaveLength(4)
})

test('says so when nothing ran yet', async ($, on) => {
  world(on)

  expect((await $.command.run(run())).text).toBe('No tool results yet this session.')
})

test('speaks the language set in the hub', async ($, on) => {
  world(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => PT)

  expect((await $.command.run(run())).text).toBe('Nenhum resultado de ferramenta ainda nesta sessão.')

  await $.tool.call({ tool: 'Bash', command: 'ls', tool_use_id: 'p1' })
  expect((await $.command.run(run())).text).toContain('Resultados mais pesados (cerca de')
})
