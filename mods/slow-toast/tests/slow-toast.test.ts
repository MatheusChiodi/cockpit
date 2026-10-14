import { expect, mock, test } from 'claude-code/testing'

const OUT = { stdout: '', stderr: '', interrupted: false }

const setup = (on: Parameters<typeof mock.clock>[0]) => {
  const clock = mock.clock(on)
  const toasts: string[] = []
  on('ui.toast', (_$, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })
  let took = 0
  on('tool.call', { tool: 'Bash' }, async () => {
    await clock.advance(took)

    return { result: OUT }
  })

  return { toasts, take: (ms: number) => (took = ms) }
}

test('toasts the command and how long it ran after a minute', async ($, on) => {
  const { toasts, take } = setup(on)

  take(72_000)
  await $.tool.call({ tool: 'Bash', command: 'npm run build\necho done', tool_use_id: 's1' })

  expect(toasts).toEqual(['slow command: npm run build took 1m 12s'])
})

test('stays quiet for a command under a minute', async ($, on) => {
  const { toasts, take } = setup(on)

  take(59_000)
  await $.tool.call({ tool: 'Bash', command: 'npm test', tool_use_id: 's2' })

  expect(toasts).toEqual([])
})

test('speaks the language set in the hub', async ($, on) => {
  const { toasts, take } = setup(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  take(60_000)
  await $.tool.call({ tool: 'Bash', command: 'make', tool_use_id: 's3' })

  expect(toasts).toEqual(['comando lento: make levou 1m 0s'])
})
