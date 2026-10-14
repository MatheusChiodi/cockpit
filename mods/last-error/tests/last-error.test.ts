import { expect, mock, test } from 'claude-code/testing'

const run = {
  command: 'lasterr',
  args: '',
  origin: { kind: 'composer' } as const,
  presentation: { isFullscreen: true, columns: 120 },
}

const fails = (stdout: string, stderr = '') => ({ result: { stdout, stderr, interrupted: false }, isError: true as const })
const passes = (stdout: string) => ({ result: { stdout, stderr: '', interrupted: false } })

test('remembers the last failed command and the end of its output', async ($, on) => {
  mock.store(on)
  on('session.root', () => ({ value: '/work' }))
  on('tool.call', { tool: 'Bash' }, (_, e) =>
    e.command === 'npm run build'
      ? fails(Array.from({ length: 40 }, (_, i) => `line ${i + 1}`).join('\n'), 'Found 1 error.')
      : passes('fine'),
  )

  await $.tool.call({ tool: 'Bash', command: 'npm run build', tool_use_id: 'b-1' })
  await $.tool.call({ tool: 'Bash', command: 'ls', tool_use_id: 'b-2' })

  const lines = ((await $.command.run(run)).text ?? '').split('\n')
  expect(lines[0]).toBe('✗ npm run build')
  expect(lines.length).toBe(26)
  expect(lines.at(-1)).toBe('Found 1 error.')
  expect(lines).not.toContain('line 10')
})

test('keeps only the most recent failure, from Bash or PowerShell', async ($, on) => {
  mock.store(on)
  on('session.root', () => ({ value: '/work' }))
  on('tool.call', { tool: 'Bash' }, () => fails('first'))
  on('tool.call', { tool: 'PowerShell' }, () => fails('second'))

  await $.tool.call({ tool: 'Bash', command: 'make', tool_use_id: 'b-1' })
  await $.tool.call({ tool: 'PowerShell', command: 'dotnet build', tool_use_id: 'p-1' })

  expect((await $.command.run(run)).text).toBe('✗ dotnet build\nsecond')
})

test('says so when nothing failed', async ($, on) => {
  mock.store(on)
  on('session.root', () => ({ value: '/work' }))
  on('tool.call', { tool: 'Bash' }, () => passes('ok'))

  await $.tool.call({ tool: 'Bash', command: 'ls', tool_use_id: 'b-1' })
  expect((await $.command.run(run)).text).toBe('No shell command has failed this session.')
})

test('speaks the language set in the hub', async ($, on) => {
  mock.store(on)
  on('session.root', () => ({ value: '/work' }))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  expect((await $.command.run(run)).text).toBe('Nenhum comando de shell falhou nesta sessão.')
})
