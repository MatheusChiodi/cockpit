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

test('speaks Portuguese when the hub is set to pt', async ($, on) => {
  const toasts = toasting(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))
  on('tool.call', { tool: 'Read' }, () => ({ deny: '' }))

  await $.tool.call({ tool: 'Read', file_path: '/a', tool_use_id: 'p1' })

  expect(toasts).toEqual(['Read recusada: sem motivo informado'])
})

test('says no reason was given for an empty or blank refusal', async ($, on) => {
  const toasts = toasting(on)
  on('tool.call', { tool: 'Bash' }, () => ({ deny: '   \n  ' }))

  await $.tool.call({ tool: 'Bash', command: 'x', tool_use_id: 'n1' })

  expect(toasts).toEqual(['Bash refused: no reason given'])
})

test('skips leading blank lines and cuts a long reason at 90 characters', async ($, on) => {
  const toasts = toasting(on)
  const long = 'x'.repeat(120)
  on('tool.call', { tool: 'Bash' }, () => ({ deny: `\n\n   ${long}\nsecond` }))

  await $.tool.call({ tool: 'Bash', command: 'x', tool_use_id: 'l1' })

  expect(toasts).toEqual([`Bash refused: ${'x'.repeat(89)}…`])
})

test('names whatever tool was refused, and stays quiet for an error', async ($, on) => {
  const toasts = toasting(on)
  on('tool.call', { tool: 'Write' }, () => ({ deny: 'env-guard: protected' }))
  on('tool.call', { tool: 'Edit' }, () => ({ isError: true, result: 'old_string not found' }) as never)

  await $.tool.call({ tool: 'Write', file_path: '/.env', content: '', tool_use_id: 'w1' })
  await $.tool.call({ tool: 'Edit', file_path: '/a', old_string: 'a', new_string: 'b', tool_use_id: 'e1' })

  expect(toasts).toEqual(['Write refused: env-guard: protected'])
})

test('passes the refusal back unchanged', async ($, on) => {
  toasting(on)
  on('tool.call', { tool: 'Bash' }, () => ({ deny: 'line one\nline two' }))

  const answer = await $.tool.call({ tool: 'Bash', command: 'x', tool_use_id: 'u1' })
  expect(answer.deny).toBe('line one\nline two')
})
