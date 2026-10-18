import { expect, mock, test } from 'claude-code/testing'

const SENT = { value: { isSent: true, channel: 'terminal_bell' } } as const

const OK = { result: { stdout: '', stderr: '', interrupted: false } }
const FAILED = { result: { stdout: '', stderr: '2 failed', interrupted: false }, isError: true as const }

test('notifies pass or fail when a test run took 30 seconds or more', async ($, on) => {
  const clock = mock.clock(on)
  const sent: string[] = []
  let answer: typeof OK | typeof FAILED = OK
  on('tool.call', { tool: 'Bash' }, async () => {
    await clock.sleep(48000)

    return answer
  })
  on('ui.notify', (_, e) => {
    sent.push(e.text)

    return SENT
  })

  const first = $.tool.call({ tool: 'Bash', command: 'npm test', tool_use_id: 't-1' })
  await clock.advance(48000)
  await first
  expect(sent).toEqual(['Tests passed after 48s: npm test'])

  answer = FAILED
  const second = $.tool.call({ tool: 'Bash', command: 'pytest -x', tool_use_id: 't-2' })
  await clock.advance(48000)
  await second
  expect(sent[1]).toBe('Tests failed after 48s: pytest -x')
})

test('stays quiet for a quick run and for commands that are not tests', async ($, on) => {
  const clock = mock.clock(on)
  const sent: string[] = []
  let wait = 20000
  on('tool.call', { tool: 'Bash' }, async () => {
    await clock.sleep(wait)

    return OK
  })
  on('ui.notify', (_, e) => {
    sent.push(e.text)

    return SENT
  })

  const quick = $.tool.call({ tool: 'Bash', command: 'npm test', tool_use_id: 'q-1' })
  await clock.advance(20000)
  await quick

  wait = 90000
  const build = $.tool.call({ tool: 'Bash', command: 'npm run build', tool_use_id: 'q-2' })
  await clock.advance(90000)
  await build
  expect(sent).toEqual([])
})

test('speaks the language set in the hub', async ($, on) => {
  const clock = mock.clock(on)
  const sent: string[] = []
  on('tool.call', { tool: 'Bash' }, async () => {
    await clock.sleep(40000)

    return FAILED
  })
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))
  on('ui.notify', (_, e) => {
    sent.push(e.text)

    return SENT
  })

  const run = $.tool.call({ tool: 'Bash', command: 'vitest run', tool_use_id: 'pt-1' })
  await clock.advance(40000)
  await run
  expect(sent).toEqual(['Testes falharam após 40s: vitest run'])
})

// A test run that takes `ms` and answers `answer`; returns the notifications sent.
const slow = (on: any, clock: { sleep: (ms: number) => Promise<void> }, ms: number, answer: () => unknown) => {
  const sent: string[] = []
  on('tool.call', { tool: 'Bash' }, async () => {
    await clock.sleep(ms)

    return answer()
  })
  on('tool.call', { tool: 'PowerShell' }, async () => {
    await clock.sleep(ms)

    return answer()
  })
  on('ui.notify', (_: unknown, e: { text: string }) => {
    sent.push(e.text)

    return SENT
  })

  return sent
}

test('stays quiet for an interrupted or refused run', async ($, on) => {
  const clock = mock.clock(on)
  let answer: unknown = { result: { stdout: '', stderr: '', interrupted: true } }
  const sent = slow(on, clock, 60000, () => answer)

  const interrupted = $.tool.call({ tool: 'Bash', command: 'npm test', tool_use_id: 'i-1' })
  await clock.advance(60000)
  await interrupted

  answer = { deny: 'blocked' }
  const refused = $.tool.call({ tool: 'Bash', command: 'npm test', tool_use_id: 'i-2' })
  await clock.advance(60000)
  await refused
  expect(sent).toEqual([])
})

test('writes minutes and seconds, and cuts a long command to its first line', async ($, on) => {
  const clock = mock.clock(on)
  const sent = slow(on, clock, 65000, () => OK)

  const command = `npx jest --runInBand ${'packages/very/long/path/'.repeat(4)}\necho done`
  const run = $.tool.call({ tool: 'Bash', command, tool_use_id: 'm-1' })
  await clock.advance(65000)
  await run

  const line = command.split('\n')[0]!
  expect(sent).toEqual([`Tests passed after 1m 05s: ${line.slice(0, 59)}…`])
})

test('times test runs in PowerShell too', async ($, on) => {
  const clock = mock.clock(on)
  const sent = slow(on, clock, 30000, () => FAILED)

  const run = $.tool.call({ tool: 'PowerShell', command: 'dotnet test', tool_use_id: 'p-1' })
  await clock.advance(30000)
  await run
  expect(sent).toEqual(['Tests failed after 30s: dotnet test'])
})

test('speaks Spanish when the hub says so', async ($, on) => {
  const clock = mock.clock(on)
  const sent = slow(on, clock, 31000, () => OK)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  const run = $.tool.call({ tool: 'Bash', command: 'cargo test', tool_use_id: 'es-1' })
  await clock.advance(31000)
  await run
  expect(sent).toEqual(['Los tests pasaron tras 31s: cargo test'])
})
