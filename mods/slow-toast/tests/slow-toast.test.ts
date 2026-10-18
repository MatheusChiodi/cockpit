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

test('cuts a long command line to 60 characters', async ($, on) => {
  const { toasts, take } = setup(on)

  take(90_000)
  await $.tool.call({ tool: 'Bash', command: `  ${'x'.repeat(80)}  `, tool_use_id: 's4' })

  expect(toasts).toEqual([`slow command: ${'x'.repeat(59)}… took 1m 30s`])
})

test('says nothing for a refused call and hands the answer back', async ($, on) => {
  const clock = mock.clock(on)
  const toasts: string[] = []
  on('ui.toast', (_$, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })
  on('tool.call', { tool: 'Bash' }, async () => {
    await clock.advance(120_000)

    return { deny: 'blocked beneath' }
  })

  const answer = await $.tool.call({ tool: 'Bash', command: 'rm -rf /', tool_use_id: 's5' })
  expect(answer.deny).toBe('blocked beneath')
  expect(toasts).toEqual([])
})

test('watches PowerShell too, in Spanish', async ($, on) => {
  const clock = mock.clock(on)
  const toasts: string[] = []
  on('ui.toast', (_$, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))
  on('tool.call', { tool: 'PowerShell' }, async () => {
    await clock.advance(185_000)

    return { result: OUT as never }
  })

  await $.tool.call({ tool: 'PowerShell', command: 'dotnet test', tool_use_id: 'p1' })
  expect(toasts).toEqual(['comando lento: dotnet test tardó 3m 5s'])
})

test('rounds to the second', async ($, on) => {
  const { toasts, take } = setup(on)

  take(119_600)
  await $.tool.call({ tool: 'Bash', command: 'cargo build', tool_use_id: 's6' })

  expect(toasts).toEqual(['slow command: cargo build took 2m 0s'])
})
