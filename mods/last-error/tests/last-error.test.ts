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

const START = { cwd: '/work', surface: null, isInteractive: true } as const

test('shows (no output) for a failure that printed nothing, in each language', async ($, on) => {
  mock.store(on)
  let lang = 'en'
  on('session.root', () => ({ value: '/work' }))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: lang, version: 1 } }))
  on('tool.call', { tool: 'Bash' }, () => fails('  \n\n', ''))

  await $.tool.call({ tool: 'Bash', command: 'false', tool_use_id: 'b-1' })
  expect((await $.command.run(run)).text).toBe('✗ false\n(no output)')
  lang = 'pt'
  expect((await $.command.run(run)).text).toBe('✗ false\n(sem saída)')
  lang = 'es'
  expect((await $.command.run(run)).text).toBe('✗ false\n(sin salida)')
})

test('leaves denied calls out and hands the result back untouched', async ($, on) => {
  mock.store(on)
  on('session.root', () => ({ value: '/work' }))
  on('tool.call', { tool: 'Bash' }, () => ({ deny: 'blocked', isError: true } as never))

  const answer = await $.tool.call({ tool: 'Bash', command: 'rm -rf /', tool_use_id: 'b-1' })
  expect(answer.deny).toBe('blocked')
  expect((await $.command.run(run)).text).toBe('No shell command has failed this session.')
})

test('reads a failure whose result is plain text', async ($, on) => {
  mock.store(on)
  on('session.root', () => ({ value: '/work' }))
  on('tool.call', { tool: 'PowerShell' }, () => ({ result: 'boom\nat line 3' as never, isError: true as const }))

  await $.tool.call({ tool: 'PowerShell', command: 'Get-Item x', tool_use_id: 'p-1' })
  expect((await $.command.run(run)).text).toBe('✗ Get-Item x\nboom\nat line 3')
})

test('a new session forgets the previous failure', async ($, on) => {
  mock.store(on)
  on('session.root', () => ({ value: '/work' }))
  on('session.start', (_: unknown, e: any) => ({ cwd: e.cwd }))
  on('command.register', (_$, e) => ({ value: { command: e.name } }))
  on('tool.call', { tool: 'Bash' }, () => fails('oops'))

  await $.tool.call({ tool: 'Bash', command: 'make', tool_use_id: 'b-1' })
  expect((await $.command.run(run)).text).toBe('✗ make\noops')

  await $.session.start(START)
  expect((await $.command.run(run)).text).toBe('No shell command has failed this session.')
})

test('keeps the failure of each project apart', async ($, on) => {
  mock.store(on)
  let root = '/work'
  on('session.root', () => ({ value: root }))
  on('tool.call', { tool: 'Bash' }, () => fails('oops'))

  await $.tool.call({ tool: 'Bash', command: 'make', tool_use_id: 'b-1' })
  root = '/other'
  expect((await $.command.run(run)).text).toBe('No shell command has failed this session.')
  root = '/work'
  expect((await $.command.run(run)).text).toBe('✗ make\noops')
})
