import { expect, test } from 'claude-code/testing'

const submit = (text: string, kind: 'composer' | 'sdk' = 'composer') => ({ text, wait: false, origin: { kind } }) as never

const bash = ($: any, command: string) => $.tool.call({ tool: 'Bash', command, tool_use_id: command })

// Bash answers by the command: one that contains `fail` is an error with its output as the result.
const shell = (on: any, stderr = 'error TS2322: bad type in src/a.ts\n') => {
  const seen: { context: readonly string[] | undefined } = { context: undefined }

  on('tool.call', { tool: 'Bash' }, (_$: unknown, e: { command: string }) =>
    e.command.includes('fail')
      ? { result: { stdout: 'building\n', stderr } as never, isError: true as const }
      : { result: undefined as never })
  on('prompt.submit', (_$: unknown, e: { text: string; context?: readonly string[] }) => {
    seen.context = e.context

    return { text: e.text }
  })

  return seen
}

test('carries the failed commands as hidden context on the next prompt', async ($, on) => {
  const seen = shell(on)

  await bash($, 'npm run build --fail')
  await $.prompt.submit(submit('try again'))

  const text = seen.context?.join('\n') ?? ''
  expect(text).toContain('change something before running them again')
  expect(text).toContain('- npm run build --fail -> error TS2322: bad type in src/a.ts')
})

test('drops a command once it succeeds, and says nothing when nothing failed', async ($, on) => {
  const seen = shell(on)

  await $.prompt.submit(submit('hello'))
  expect(seen.context).toBeUndefined()

  await bash($, 'make fail')
  await bash($, 'make fail ')
  await $.prompt.submit(submit('again'))
  expect(seen.context?.join('\n').match(/- make fail/g)?.length).toBe(1)

  await bash($, 'make')
  await bash($, 'make fail')
  await bash($, 'echo fail')
  await $.prompt.submit(submit('again'))
  expect(seen.context?.join('\n')).toContain('- echo fail')
})

test('keeps only the last five and ignores other origins and slash commands', async ($, on) => {
  const seen = shell(on)

  for (let i = 0; i < 7; i++) {
    await bash($, `job-${i} fail`)
  }

  await $.prompt.submit(submit('go'))
  const text = seen.context?.join('\n') ?? ''
  expect(text).not.toContain('job-0 ')
  expect(text).not.toContain('job-1 ')
  expect(text).toContain('job-6 fail')

  seen.context = undefined
  await $.prompt.submit(submit('go', 'sdk'))
  expect(seen.context).toBeUndefined()
  await $.prompt.submit(submit('/status'))
  expect(seen.context).toBeUndefined()
})

test('never lets a credential from the command or the output through', async ($, on) => {
  const leak = `ghp_${'a1B2'.repeat(9)}`
  const seen = shell(on, `denied for password: hunter2 token ${leak}\n`)

  await bash($, `curl -H "Authorization: Bearer ${leak}" https://x.test API_TOKEN=abc123 fail`)
  await $.prompt.submit(submit('go'))

  const text = seen.context?.join('\n') ?? ''
  expect(text).toContain('curl')
  expect(text).not.toContain(leak)
  expect(text).not.toContain('abc123')
  expect(text).not.toContain('hunter2')
})

test('a new session starts with no failures', async ($, on) => {
  const seen = shell(on)
  on('session.start', (_$, e) => ({ cwd: e.cwd }))

  await bash($, 'make fail')
  await $.session.start({ cwd: '/p', surface: 'terminal', isInteractive: true })
  await $.prompt.submit(submit('go'))
  expect(seen.context).toBeUndefined()
})

test('watches PowerShell, and a failure with no output has no reason', async ($, on) => {
  const seen = shell(on)
  on('tool.call', { tool: 'PowerShell' }, () => ({ result: { stdout: '', stderr: '' } as never, isError: true as const }))

  await $.tool.call({ tool: 'PowerShell', command: 'Get-Item nope', tool_use_id: 'p1' })
  await $.prompt.submit(submit('go'))
  expect(seen.context?.join('\n')).toContain('- Get-Item nope\n'.trimEnd())
  expect(seen.context?.join('\n')).not.toContain('->')
})

test('a denied command is neither recorded nor cleared', async ($, on) => {
  const seen: { context: readonly string[] | undefined } = { context: undefined }
  on('tool.call', { tool: 'Bash' }, (_$, e) =>
    e.command === 'blocked' || e.command === 'make fail' && e.tool_use_id === 'denied-retry'
      ? ({ deny: 'no' } as never)
      : ({ result: { stdout: '', stderr: 'boom' } as never, isError: true as const }),
  )
  on('prompt.submit', (_$, e) => {
    seen.context = e.context

    return { text: e.text }
  })

  await $.tool.call({ tool: 'Bash', command: 'blocked', tool_use_id: 'b1' })
  await $.prompt.submit(submit('go'))
  expect(seen.context).toBeUndefined()

  await $.tool.call({ tool: 'Bash', command: 'make fail', tool_use_id: 'b2' })
  await $.tool.call({ tool: 'Bash', command: 'make fail', tool_use_id: 'denied-retry' })
  await $.prompt.submit(submit('go'))
  expect(seen.context?.join('\n')).toContain('- make fail -> boom')
})

test('clips a long command and a long reason', async ($, on) => {
  const seen = shell(on, `${'err '.repeat(60)}\n`)
  const long = `echo ${'x '.repeat(80)}fail`

  await bash($, long)
  await $.prompt.submit(submit('go'))
  const line = (seen.context?.join('\n') ?? '').split('\n').find(text => text.startsWith('- ')) ?? ''
  const [command, reason] = line.slice(2).split(' -> ')
  expect(command).toHaveLength(101)
  expect(command?.endsWith('…')).toBe(true)
  expect(reason).toBe(`${'err '.repeat(60).trim().slice(0, 100)}…`)
})

test('keeps the context the prompt already had', async ($, on) => {
  const seen = shell(on)

  await bash($, 'make fail')
  await $.prompt.submit({ text: 'go', wait: false, origin: { kind: 'composer' }, context: ['earlier'] } as never)
  expect(seen.context?.[0]).toBe('earlier')
  expect(seen.context).toHaveLength(2)
})
