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

// A Bash that takes `ms` and answers `answer`; returns what was notified, with its title.
const slow = (on: any, clock: ReturnType<typeof mock.clock>, ms: number, answer: () => unknown) => {
  const sent: { text: string; title?: string }[] = []
  on('tool.call', { tool: 'Bash' }, async () => {
    await clock.sleep(ms)

    return answer()
  })
  on('ui.notify', (_: unknown, e: { text: string; title?: string }) => {
    sent.push({ text: e.text, title: e.title })

    return SENT
  })

  return sent
}

const timed = async ($: any, clock: ReturnType<typeof mock.clock>, ms: number, command: string, extra = {}) => {
  const run = $.tool.call({ tool: 'Bash', command, tool_use_id: `t-${command}-${Math.random()}`, ...extra })
  await clock.advance(ms)

  return run
}

test('notifies at exactly two minutes under the Claude Code title', async ($, on) => {
  const clock = mock.clock(on)
  const sent = slow(on, clock, 120000, () => OK)

  await timed($, clock, 120000, 'make')
  expect(sent).toEqual([{ text: 'Command finished after 2m 00s: make', title: 'Claude Code' }])
})

test('shows only the first line of the command, cut to 60 characters', async ($, on) => {
  const clock = mock.clock(on)
  const sent = slow(on, clock, 130000, () => OK)

  await timed($, clock, 130000, `  ${'x'.repeat(80)}\nsecond line`)
  expect(sent[0]?.text).toBe(`Command finished after 2m 10s: ${'x'.repeat(59)}…`)
})

test('stays quiet for a refused command and for a subagent', async ($, on) => {
  const clock = mock.clock(on)
  let deny = true
  const sent = slow(on, clock, 150000, () => (deny ? { deny: 'blocked' } : OK))

  await timed($, clock, 150000, 'refused')
  deny = false
  await timed($, clock, 150000, 'sub', { agentId: 'agent-1' })
  expect(sent).toEqual([])
})

test('speaks Spanish, and Portuguese for a failure', async ($, on) => {
  const clock = mock.clock(on)
  let lang = 'es'
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: lang, version: 1 } }))
  let answer: typeof OK | typeof FAILED = OK
  const sent = slow(on, clock, 125000, () => answer)

  await timed($, clock, 125000, 'npm test')
  answer = FAILED
  await timed($, clock, 125000, 'npm test')
  lang = 'pt'
  await timed($, clock, 125000, 'npm test')

  expect(sent.map(item => item.text)).toEqual([
    'El comando terminó tras 2m 05s: npm test',
    'El comando falló tras 2m 05s: npm test',
    'Comando falhou após 2m 05s: npm test',
  ])
})
