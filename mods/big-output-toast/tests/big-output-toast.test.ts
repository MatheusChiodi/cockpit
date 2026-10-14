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
