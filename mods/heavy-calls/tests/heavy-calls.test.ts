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

test('shows five rows and counts every call in the total', async ($, on) => {
  world(on)

  for (let n = 0; n < 6; n += 1) {
    await $.tool.call({ tool: 'Bash', command: `echo ${n}`, tool_use_id: `s${n}` })
  }
  await $.tool.call({ tool: 'Bash', command: 'cat big.log', tool_use_id: 'big' })

  const rows = ((await $.command.run(run())).text ?? '').split('\n')
  // 6 × 445 + 40045 characters, a token every 4.
  expect(rows[0]).toBe('Heaviest results (about 10,679 tokens in 7 calls)')
  expect(rows).toHaveLength(6)
  expect(rows[1]).toBe('  1.   10,011 tok  Bash   cat big.log')
  expect(rows[2]).toBe('  2.      111 tok  Bash   echo 0')
})

test('leaves denied and failed calls out', async ($, on) => {
  on('tool.call', { tool: 'Bash' }, () => ({ deny: 'refused' }))
  on('tool.call', { tool: 'Grep' }, () => ({ result: 'boom' as never, isError: true }) as never)

  await $.tool.call({ tool: 'Bash', command: 'ls', tool_use_id: 'd1' })
  await $.tool.call({ tool: 'Grep', pattern: 'x', tool_use_id: 'g1' })

  expect((await $.command.run(run())).text).toBe('No tool results yet this session.')
})

test('shows the target with whitespace collapsed and cut to 56 characters', async ($, on) => {
  world(on)
  const command = `echo   one\n  two ${'z'.repeat(80)}`

  await $.tool.call({ tool: 'Bash', command, tool_use_id: 'w1' })

  const row = ((await $.command.run(run())).text ?? '').split('\n')[1] ?? ''
  expect(row.endsWith(`Bash   ${'echo one two '.concat('z'.repeat(80)).slice(0, 56)}`)).toBe(true)
})

test('formats numbers for Spanish when the hub is set to es', async ($, on) => {
  world(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  expect((await $.command.run(run())).text).toBe('Aún no hay resultados de herramientas en esta sesión.')

  await $.tool.call({ tool: 'Bash', command: 'cat big.log', tool_use_id: 'e1' })
  const rows = ((await $.command.run(run())).text ?? '').split('\n')
  expect(rows[0]).toBe('Resultados más pesados (unos 10.011 tokens en 1 llamadas)')
  expect(rows[1]).toBe('  1.   10.011 tok  Bash   cat big.log')
})
