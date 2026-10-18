import { expect, test } from 'claude-code/testing'

const done = (stdout: string) => ({
  value: { exitCode: 0, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false },
})

const rows = (count: number, each: number) =>
  Array.from({ length: count }, (_, i) => `${each}\t0\tsrc/f${i}.ts`).join('\n')

test('asks before a big commit and lets small ones through', async ($, on) => {
  let numstat = rows(2, 10)
  const calls: string[] = []
  on('process.run', (_, e) => {
    calls.push(e.argv.slice(2).join(' '))

    return done(numstat)
  })
  on('tool.check', () => ({ decision: 'allow' }))

  const small = await $.tool.check({ tool: 'Bash', input: { command: 'git commit -m "x"' } })
  expect(small.decision).toBe('allow')

  numstat = rows(3, 200)
  const big = await $.tool.check({ tool: 'Bash', input: { command: 'git commit -m "x"' } })
  expect(big.decision).toBe('ask')
  expect(big.reason).toContain('3 file(s), 600 changed line(s)')

  numstat = rows(12, 1)
  const many = await $.tool.check({ tool: 'Bash', input: { command: 'git commit -m "x"' } })
  expect(many.decision).toBe('ask')

  const all = await $.tool.check({ tool: 'Bash', input: { command: 'git commit -am "x"' } })
  expect(all.decision).toBe('ask')
  expect(calls[calls.length - 1]).toBe('diff HEAD --numstat')
  expect(calls[0]).toBe('diff --cached --numstat')

  const other = await $.tool.check({ tool: 'Bash', input: { command: 'git status' } })
  expect(other.decision).toBe('allow')
})

test('does not loosen a verdict that is already a deny', async ($, on) => {
  on('process.run', () => done(rows(20, 50)))
  on('tool.check', () => ({ decision: 'deny', reason: 'blocked beneath' }))

  const verdict = await $.tool.check({ tool: 'Bash', input: { command: 'git commit -m "x"' } })
  expect(verdict.decision).toBe('deny')
})

test('speaks the language set in the hub', async ($, on) => {
  on('process.run', () => done(rows(3, 200)))
  on('tool.check', () => ({ decision: 'allow' }))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  const verdict = await $.tool.check({ tool: 'Bash', input: { command: 'git commit -m "x"' } })
  expect(verdict.reason).toContain('Revise o diff')
})

test('the limits themselves pass: 10 files and 300 lines', async ($, on) => {
  let numstat = rows(10, 30)
  on('process.run', () => done(numstat))
  on('tool.check', () => ({ decision: 'allow' }))

  expect((await $.tool.check({ tool: 'Bash', input: { command: 'git commit -m x' } })).decision).toBe('allow')

  numstat = rows(10, 31)
  const over = await $.tool.check({ tool: 'Bash', input: { command: 'git commit -m x' } })
  expect(over.reason).toBe('commit-review: 10 file(s), 310 changed line(s) staged. Review the diff, then confirm to commit.')
})

test('counts binary files as files with no lines, and removed lines as changed', async ($, on) => {
  on('process.run', () => done(['-\t-\tlogo.png', '0\t350\told.ts'].join('\n')))
  on('tool.check', () => ({ decision: 'allow' }))

  const verdict = await $.tool.check({ tool: 'Bash', input: { command: 'git commit -m x' } })
  expect(verdict.reason).toContain('2 file(s), 350 changed line(s)')
})

test('lets the commit through when git diff fails', async ($, on) => {
  on('process.run', () => ({ value: { exitCode: 128, stdout: '', stderr: 'fatal', isStdoutTruncated: false, isStderrTruncated: false } }))
  on('tool.check', () => ({ decision: 'allow' }))

  expect((await $.tool.check({ tool: 'Bash', input: { command: 'git commit -m x' } })).decision).toBe('allow')
})

test('asks for confirmation when git cannot run at all', async ($, on) => {
  on('process.run', () => {
    throw new Error('spawn git ENOENT')
  })
  on('tool.check', () => ({ decision: 'allow' }))

  const verdict = await $.tool.check({ tool: 'Bash', input: { command: 'git commit -m x' } })
  expect(verdict).toEqual({ decision: 'ask', reason: 'commit-review: the check failed, confirm before committing.' })
})

test('checks PowerShell commits and --all against HEAD, and ignores other tools', async ($, on) => {
  const calls: string[] = []
  on('process.run', (_, e) => {
    calls.push(e.argv.slice(2).join(' '))

    return done(rows(20, 1))
  })
  on('tool.check', () => ({ decision: 'allow' }))

  const ps = await $.tool.check({ tool: 'PowerShell', input: { command: 'git commit --all -m "x"' } })
  expect(ps.decision).toBe('ask')
  expect(calls).toEqual(['diff HEAD --numstat'])

  const write = await $.tool.check({ tool: 'Write', input: { file_path: '/a', content: 'git commit -m x' } })
  expect(write.decision).toBe('allow')
  expect(calls).toHaveLength(1)
})

test('speaks Spanish when the hub is set to es', async ($, on) => {
  on('process.run', () => done(rows(11, 1)))
  on('tool.check', () => ({ decision: 'allow' }))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  const verdict = await $.tool.check({ tool: 'Bash', input: { command: 'git commit -m x' } })
  expect(verdict.reason).toBe('commit-review: 11 archivo(s), 11 línea(s) cambiadas en el stage. Revisa el diff y confirma para commitear.')
})
