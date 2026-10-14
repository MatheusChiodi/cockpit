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
