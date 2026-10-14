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
