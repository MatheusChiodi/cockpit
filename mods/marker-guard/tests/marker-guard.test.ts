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

test('speaks Spanish when the hub is set to es', async ($, on) => {
  on('process.run', () => done('src/a.ts\n'))
  on('tool.call', { tool: 'Bash' }, () => ANSWER)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  const answer = await $.tool.call({ tool: 'Bash', command: 'git commit -m "x"', tool_use_id: 'es' })
  expect(answer.deny).toBe(
    'marker-guard rechazó el commit: marcadores de conflicto sin resolver en src/a.ts. Resuélvelos, haz el stage de nuevo y commitea.',
  )
})

test('names five files and counts the rest', async ($, on) => {
  on('process.run', () => done(Array.from({ length: 8 }, (_, i) => `f${i}.ts`).join('\n')))
  on('tool.call', { tool: 'Bash' }, () => ANSWER)

  const answer = await $.tool.call({ tool: 'Bash', command: 'git commit -m "x"', tool_use_id: 'n1' })
  expect(answer.deny).toContain('in f0.ts, f1.ts, f2.ts, f3.ts, f4.ts (+3).')
})

test('reads the whole tree for --all and guards PowerShell too', async ($, on) => {
  const calls: string[] = []
  on('process.run', (_, e) => {
    calls.push(e.argv.slice(2).join(' '))

    return done('a.ts\n')
  })
  on('tool.call', { tool: 'PowerShell' }, () => ANSWER as never)

  const answer = await $.tool.call({ tool: 'PowerShell', command: 'git commit --all -m "x"', tool_use_id: 'ps1' })
  expect(answer.deny).toContain('marker-guard refused the commit')
  expect(calls).toEqual(['diff HEAD --name-only -G^(<<<<<<< |>>>>>>> )'])
})

test('lets the commit through when git diff fails', async ($, on) => {
  let ran = 0
  on('process.run', () => done('a.ts\n', 128))
  on('tool.call', { tool: 'Bash' }, () => {
    ran += 1

    return ANSWER
  })

  const answer = await $.tool.call({ tool: 'Bash', command: 'git commit -m "x"', tool_use_id: 'g1' })
  expect(answer.deny).toBeUndefined()
  expect(ran).toBe(1)
})

test('refuses with the fallback reason when git cannot be run', async ($, on) => {
  let ran = 0
  on('process.run', () => {
    throw new Error('spawn git ENOENT')
  })
  on('tool.call', { tool: 'Bash' }, () => {
    ran += 1

    return ANSWER
  })

  const answer = await $.tool.call({ tool: 'Bash', command: 'git commit -m "x"', tool_use_id: 'g2' })
  expect(answer.deny).toBe('marker-guard: the check failed, command refused.')
  expect(ran).toBe(0)
})
