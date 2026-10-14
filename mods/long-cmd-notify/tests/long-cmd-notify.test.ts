import { expect, mock, test } from 'claude-code/testing'

const SENT = { value: { isSent: true, channel: 'terminal_bell' } } as const

const OK = { result: { stdout: '', stderr: '', interrupted: false } }
const FAILED = { result: { stdout: '', stderr: 'boom', interrupted: false }, isError: true as const }

test('notifies with the exit state when a command ran two minutes or more', async ($, on) => {
  const clock = mock.clock(on)
  const sent: string[] = []
  let answer: typeof OK | typeof FAILED = OK
  on('tool.call', { tool: 'Bash' }, async () => {
    await clock.sleep(150000)

    return answer
  })
  on('ui.notify', (_, e) => {
    sent.push(e.text)

    return SENT
  })

  const first = $.tool.call({ tool: 'Bash', command: 'npm run build', tool_use_id: 'l-1' })
  await clock.advance(150000)
  await first
  expect(sent).toEqual(['Command finished after 2m 30s: npm run build'])

  answer = FAILED
  const second = $.tool.call({ tool: 'Bash', command: 'npm run build', tool_use_id: 'l-2' })
  await clock.advance(150000)
  await second
  expect(sent[1]).toContain('Command failed after 2m 30s')
})

test('stays quiet for a quick command', async ($, on) => {
  const clock = mock.clock(on)
  const sent: string[] = []
  on('tool.call', { tool: 'Bash' }, async () => {
    await clock.sleep(119000)

    return OK
  })
  on('ui.notify', (_, e) => {
    sent.push(e.text)

    return SENT
  })

  const run = $.tool.call({ tool: 'Bash', command: 'sleep 119', tool_use_id: 'q-1' })
  await clock.advance(119000)
  await run
  expect(sent).toEqual([])
})

test('stays quiet for an interrupted command, and speaks the hub language', async ($, on) => {
  const clock = mock.clock(on)
  const sent: string[] = []
  let interrupted = true
  on('tool.call', { tool: 'PowerShell' }, async () => {
    await clock.sleep(200000)

    return { result: { stdout: '', stderr: '', interrupted } }
  })
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))
  on('ui.notify', (_, e) => {
    sent.push(e.text)

    return SENT
  })

  const first = $.tool.call({ tool: 'PowerShell', command: 'Start-Sleep 200', tool_use_id: 'i-1' })
  await clock.advance(200000)
  await first
  expect(sent).toEqual([])

  interrupted = false
  const second = $.tool.call({ tool: 'PowerShell', command: 'Start-Sleep 200', tool_use_id: 'i-2' })
  await clock.advance(200000)
  await second
  expect(sent).toEqual(['Comando terminou após 3m 20s: Start-Sleep 200'])
})
