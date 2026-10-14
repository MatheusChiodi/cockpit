import { expect, test } from 'claude-code/testing'

const ANSWER = { result: { stdout: '', stderr: '', interrupted: false } }

const done = (stdout: string, exitCode = 0) => ({
  value: { exitCode, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false },
})

test('refuses a commit whose staged diff holds conflict markers', async ($, on) => {
  let files = 'src/a.ts\nsrc/b.ts\n'
  const calls: string[] = []
  on('process.run', (_, e) => {
    calls.push(e.argv.slice(2).join(' '))

    return done(files)
  })
  on('tool.call', { tool: 'Bash' }, () => ANSWER)

  const refused = await $.tool.call({ tool: 'Bash', command: 'git commit -m "merge"', tool_use_id: 'm1' })
  expect(refused.deny).toContain('unresolved conflict markers in src/a.ts, src/b.ts')
  expect(calls[0]).toContain('diff --cached --name-only')

  await $.tool.call({ tool: 'Bash', command: 'git commit -am "merge"', tool_use_id: 'm2' })
  expect(calls[1]).toContain('diff HEAD --name-only')

  files = ''
  const clean = await $.tool.call({ tool: 'Bash', command: 'git commit -m "merge"', tool_use_id: 'm3' })
  expect(clean.deny).toBeUndefined()

  const other = await $.tool.call({ tool: 'Bash', command: 'git status', tool_use_id: 'm4' })
  expect(other.deny).toBeUndefined()
  expect(calls).toHaveLength(3)
})

test('speaks the language set in the hub', async ($, on) => {
  on('process.run', () => done('src/a.ts\n'))
  on('tool.call', { tool: 'Bash' }, () => ANSWER)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  const answer = await $.tool.call({ tool: 'Bash', command: 'git commit -m "x"', tool_use_id: 'pt' })
  expect(answer.deny).toContain('marcadores de conflito sem resolver')
})
