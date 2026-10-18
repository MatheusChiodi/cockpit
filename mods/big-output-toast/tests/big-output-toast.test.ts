import { expect, mock, test } from 'claude-code/testing'

const toasting = (on: Parameters<typeof mock.clock>[0]) => {
  const toasts: string[] = []
  on('ui.toast', (_$, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })

  return toasts
}

test('toasts the tool and the size when a result passes 20,000 characters', async ($, on) => {
  const toasts = toasting(on)
  on('tool.call', { tool: 'Bash' }, () => ({ result: { stdout: 'x'.repeat(30_000), stderr: '', interrupted: false } }))

  await $.tool.call({ tool: 'Bash', command: 'git log -p', tool_use_id: 'b1' })

  expect(toasts).toHaveLength(1)
  expect(toasts[0]).toMatch(/^Bash returned 30,0\d\d characters: that eats the context$/)
})

test('stays quiet for a small result', async ($, on) => {
  const toasts = toasting(on)
  on('tool.call', { tool: 'Bash' }, () => ({ result: { stdout: 'x'.repeat(1_000), stderr: '', interrupted: false } }))

  await $.tool.call({ tool: 'Bash', command: 'ls', tool_use_id: 'b2' })

  expect(toasts).toEqual([])
})

test('speaks the language set in the hub', async ($, on) => {
  const toasts = toasting(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))
  on('tool.call', { tool: 'Bash' }, () => ({ result: { stdout: 'x'.repeat(25_000), stderr: '', interrupted: false } }))

  await $.tool.call({ tool: 'Bash', command: 'cat big', tool_use_id: 'b3' })

  expect(toasts[0]).toContain('Bash devolveu')
  expect(toasts[0]).toContain('caracteres: isso consome o contexto')
})

test('measures the text the model reads before the raw result', async ($, on) => {
  const toasts = toasting(on)
  let answer: any = { result: { stdout: 'x'.repeat(50_000), stderr: '', interrupted: false }, text: 'short' }
  on('tool.call', { tool: 'Bash' }, () => answer)

  await $.tool.call({ tool: 'Bash', command: 'a', tool_use_id: 't1' })
  expect(toasts).toEqual([])

  answer = { result: { stdout: '', stderr: '', interrupted: false }, text: 'y'.repeat(21_000) }
  await $.tool.call({ tool: 'Bash', command: 'b', tool_use_id: 't2' })
  expect(toasts).toEqual(['Bash returned 21,000 characters: that eats the context'])
})

test('stays quiet at exactly 20,000 characters and for a refused call', async ($, on) => {
  const toasts = toasting(on)
  let answer: any = { result: {}, text: 'z'.repeat(20_000) }
  on('tool.call', { tool: 'Bash' }, () => answer)

  await $.tool.call({ tool: 'Bash', command: 'a', tool_use_id: 'q1' })
  answer = { deny: 'x'.repeat(30_000) }
  const refused = await $.tool.call({ tool: 'Bash', command: 'b', tool_use_id: 'q2' })
  expect(refused.deny).toHaveLength(30_000)
  expect(toasts).toEqual([])
})

test('watches every tool, not only Bash', async ($, on) => {
  const toasts = toasting(on)
  on('tool.call', { tool: 'Read' }, () => ({ result: {} as never, text: 'r'.repeat(40_000) }))

  await $.tool.call({ tool: 'Read', file_path: '/big.log', tool_use_id: 'r1' })
  expect(toasts).toEqual(['Read returned 40,000 characters: that eats the context'])
})

test('speaks Spanish with Spanish digit grouping', async ($, on) => {
  const toasts = toasting(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))
  on('tool.call', { tool: 'Bash' }, () => ({ result: {} as never, text: 'x'.repeat(25_000) }))

  await $.tool.call({ tool: 'Bash', command: 'cat big', tool_use_id: 'e1' })
  expect(toasts).toEqual(['Bash devolvió 25.000 caracteres: eso consume el contexto'])
})
