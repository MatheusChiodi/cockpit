import { expect, test } from 'claude-code/testing'

const done = { answer: '', isAborted: false, turnId: 't-1', reason: 'answer', durationMs: 5000 } as const
const SHELL = { stdout: '', stderr: '', interrupted: false }

const setup = (on: any, isError: () => boolean) => {
  const toasts: string[] = []
  on('tool.call', { tool: 'Bash' }, () => ({ result: SHELL, isError: isError() }))
  on('turn.complete', (_: unknown, e: { answer: string }) => ({ text: e.answer }))
  on('ui.toast', (_: unknown, e: { text: string }) => {
    toasts.push(e.text)

    return { value: undefined }
  })

  return toasts
}

test('toasts while the last test run is failing, until one passes', async ($, on) => {
  let failing = true
  const toasts = setup(on, () => failing)

  await $.tool.call({ tool: 'Bash', command: 'npm test', tool_use_id: 'b1' })
  await $.turn.complete(done)
  await $.turn.complete(done)
  expect(toasts).toEqual(['Turn over with failing tests: npm test', 'Turn over with failing tests: npm test'])

  failing = false
  await $.tool.call({ tool: 'Bash', command: 'npm test', tool_use_id: 'b2' })
  await $.turn.complete(done)
  expect(toasts).toHaveLength(2)
})

test('ignores failing commands that are not test runs, aborted turns and subagents', async ($, on) => {
  const toasts = setup(on, () => true)

  await $.tool.call({ tool: 'Bash', command: 'ls missing', tool_use_id: 'b1' })
  await $.turn.complete(done)
  expect(toasts).toEqual([])

  await $.tool.call({ tool: 'Bash', command: 'pytest -q', tool_use_id: 'b2' })
  await $.turn.complete({ ...done, reason: 'aborted', isAborted: true })
  await $.turn.complete({ ...done, agentId: 'a1' })
  expect(toasts).toEqual([])

  await $.tool.call({ tool: 'Bash', command: 'ls', tool_use_id: 'b4' })
  await $.turn.complete(done)
  expect(toasts).toEqual(['Turn over with failing tests: pytest -q'])
})

test('speaks the language set in the hub', async ($, on) => {
  const toasts = setup(on, () => true)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  await $.tool.call({ tool: 'Bash', command: 'go test ./...', tool_use_id: 'b1' })
  await $.turn.complete(done)
  expect(toasts).toEqual(['Turno terminou com testes falhando: go test ./...'])
})

test('speaks Spanish when the hub is set to es', async ($, on) => {
  const toasts = setup(on, () => true)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  await $.tool.call({ tool: 'Bash', command: 'cargo test', tool_use_id: 'b1' })
  await $.turn.complete(done)
  expect(toasts).toEqual(['El turno terminó con tests fallando: cargo test'])
})

test('shows the first line of a long command, cut to 60 characters', async ($, on) => {
  const toasts = setup(on, () => true)
  const command = `npx vitest run ${'src/very/deep/path/'.repeat(5)}\necho done`

  await $.tool.call({ tool: 'Bash', command, tool_use_id: 'b1' })
  await $.turn.complete(done)

  const first = command.split('\n')[0] ?? ''
  expect(toasts).toEqual([`Turn over with failing tests: ${first.slice(0, 59)}…`])
})

test('an interrupted, denied or subagent test run changes nothing', async ($, on) => {
  const toasts: string[] = []
  const answer: { mode: 'fail' | 'pass-interrupted' | 'deny' } = { mode: 'fail' }
  on('tool.call', { tool: 'Bash' }, () =>
    answer.mode === 'deny'
      ? { deny: 'refused' }
      : answer.mode === 'fail'
        ? { result: SHELL, isError: true }
        : { result: { ...SHELL, interrupted: true } },
  )
  on('turn.complete', (_: unknown, e: { answer: string }) => ({ text: e.answer }))
  on('ui.toast', (_: unknown, e: { text: string }) => {
    toasts.push(e.text)

    return { value: undefined }
  })

  await $.tool.call({ tool: 'Bash', command: 'jest', tool_use_id: 'b1' })

  answer.mode = 'pass-interrupted'
  await $.tool.call({ tool: 'Bash', command: 'jest', tool_use_id: 'b2' })
  answer.mode = 'deny'
  await $.tool.call({ tool: 'Bash', command: 'jest', tool_use_id: 'b3' })
  await $.tool.call({ tool: 'Bash', command: 'jest', tool_use_id: 'b4', agentId: 'sub' } as never)

  await $.turn.complete(done)
  expect(toasts).toEqual(['Turn over with failing tests: jest'])
})

test('watches test runs in PowerShell too', async ($, on) => {
  const toasts: string[] = []
  on('tool.call', { tool: 'PowerShell' }, () => ({ result: SHELL, isError: true }) as never)
  on('turn.complete', (_: unknown, e: { answer: string }) => ({ text: e.answer }))
  on('ui.toast', (_: unknown, e: { text: string }) => {
    toasts.push(e.text)

    return { value: undefined }
  })

  await $.tool.call({ tool: 'PowerShell', command: 'dotnet test', tool_use_id: 'p1' })
  await $.turn.complete(done)
  expect(toasts).toEqual(['Turn over with failing tests: dotnet test'])
})
