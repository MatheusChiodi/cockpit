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
