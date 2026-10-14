import { expect, mock, test } from 'claude-code/testing'

const OUT = { stdout: '', stderr: '', interrupted: false }

const toasting = (on: Parameters<typeof mock.clock>[0]) => {
  const toasts: string[] = []
  on('ui.toast', (_$, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })

  return toasts
}

test('toasts the tool and the first line of the reason when a call is refused', async ($, on) => {
  const toasts = toasting(on)
  on('tool.call', { tool: 'Bash' }, () => ({ deny: 'rm-guard blocked the command.\nAsk the user to run it by hand.' }))

  const answer = await $.tool.call({ tool: 'Bash', command: 'rm -rf /', tool_use_id: 'd1' })

  expect(answer.deny).toContain('rm-guard')
  expect(toasts).toEqual(['Bash refused: rm-guard blocked the command.'])
})

test('stays quiet when the call runs', async ($, on) => {
  const toasts = toasting(on)
  on('tool.call', { tool: 'Bash' }, () => ({ result: OUT }))

  await $.tool.call({ tool: 'Bash', command: 'ls', tool_use_id: 'd2' })

  expect(toasts).toEqual([])
})

test('speaks the language set in the hub', async ($, on) => {
  const toasts = toasting(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))
  on('tool.call', { tool: 'Bash' }, () => ({ deny: 'no' }))

  await $.tool.call({ tool: 'Bash', command: 'x', tool_use_id: 'd3' })

  expect(toasts).toEqual(['Bash rechazada: no'])
})
