import { expect, mock, test } from 'claude-code/testing'

const ran = (exitCode: number, stdout: string) => ({
  value: { exitCode, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false },
})

const COMPLETE = {
  text: 'ok',
  reason: 'answer',
  answer: 'ok',
  durationMs: 1000,
  isAborted: false,
  turnId: 't1',
} as const

const START = { cwd: '/p', surface: 'terminal', isInteractive: true } as const

test('shows branch, changes and divergence at session start', async ($, on) => {
  const statuses: (string | undefined)[] = []
  let stdout = '## main...origin/main [ahead 2, behind 1]\n M a.ts\n?? b.ts\n'
  on('session.start', () => ({ cwd: '/p' }))
  on('process.run', () => ran(0, stdout))
  on('ui.status', ($, e) => {
    statuses.push(e.text)

    return { value: undefined }
  })

  await $.session.start(START)
  expect(statuses.at(-1)).toBe('⎇ main ±2 ↑2 ↓1')

  stdout = '## feature/x\n'
  await $.session.start(START)
  expect(statuses.at(-1)).toBe('⎇ feature/x ✓')
})

test('refreshes after a turn and after a mutating tool, not after a read', async ($, on) => {
  const clock = mock.clock(on)
  const statuses: (string | undefined)[] = []
  let calls = 0
  on('process.run', () => {
    calls += 1

    return ran(0, '## main\n M a.ts\n')
  })
  on('turn.complete', () => ({ text: 'ok' }))
  on('tool.call', { tool: 'Read' }, () => ({ result: { stdout: '', stderr: '', interrupted: false } }))
  on('tool.call', { tool: 'Bash' }, () => ({ result: { stdout: '', stderr: '', interrupted: false } }))
  on('ui.status', ($, e) => {
    statuses.push(e.text)

    return { value: undefined }
  })

  await $.turn.complete(COMPLETE)
  expect(calls).toBe(1)
  expect(statuses.at(-1)).toBe('⎇ main ±1')

  await $.tool.call({ tool: 'Read', file_path: '/x', tool_use_id: 'r' })
  expect(calls).toBe(1)

  await $.tool.call({ tool: 'Bash', command: 'touch a', tool_use_id: 'b' })
  await clock.settle()
  expect(calls).toBe(2)
})

test('clears the entry outside a repository or when git fails', async ($, on) => {
  const statuses: (string | undefined)[] = []
  let answer: ReturnType<typeof ran> | 'missing' = ran(128, '')
  on('session.start', () => ({ cwd: '/p' }))
  on('process.run', () => {
    if (answer === 'missing') {
      throw new Error('spawn git ENOENT')
    }

    return answer
  })
  on('ui.status', ($, e) => {
    statuses.push(e.text)

    return { value: undefined }
  })

  await $.session.start(START)
  answer = 'missing'
  await $.session.start(START)
  expect(statuses).toEqual([undefined, undefined])
})

test('reads a repository with no commits yet', async ($, on) => {
  const statuses: (string | undefined)[] = []
  on('session.start', () => ({ cwd: '/p' }))
  on('process.run', () => ran(0, '## No commits yet on trunk\n?? a\n'))
  on('ui.status', ($, e) => {
    statuses.push(e.text)

    return { value: undefined }
  })

  await $.session.start(START)
  expect(statuses.at(-1)).toBe('⎇ trunk ±1')
})

const recorder = (on: any) => {
  const statuses: (string | undefined)[] = []
  on('ui.status', (_: unknown, e: { text: string | undefined }) => {
    statuses.push(e.text)

    return { value: undefined }
  })

  return statuses
}

test('shows only the side that diverges', async ($, on) => {
  const statuses = recorder(on)
  let stdout = '## main...origin/main [ahead 3]\n'
  on('session.start', () => ({ cwd: '/p' }))
  on('process.run', () => ran(0, stdout))

  await $.session.start(START)
  expect(statuses.at(-1)).toBe('⎇ main ✓ ↑3')

  stdout = '## main...origin/main [behind 4]\nA  new.ts\n'
  await $.session.start(START)
  expect(statuses.at(-1)).toBe('⎇ main ±1 ↓4')
})

test('refreshes after Edit, Write, PowerShell and NotebookEdit, not after Grep', async ($, on) => {
  const clock = mock.clock(on)
  let calls = 0
  recorder(on)
  on('process.run', () => {
    calls += 1

    return ran(0, '## main\n')
  })
  on('tool.call', () => ({ result: undefined as never }))

  await $.tool.call({ tool: 'Grep', pattern: 'x', tool_use_id: 'g' })
  await clock.settle()
  expect(calls).toBe(0)

  await $.tool.call({ tool: 'Edit', file_path: '/a', old_string: 'a', new_string: 'b', tool_use_id: 'e' })
  await $.tool.call({ tool: 'Write', file_path: '/a', content: 'x', tool_use_id: 'w' })
  await $.tool.call({ tool: 'PowerShell', command: 'ni a', tool_use_id: 'p' })
  await $.tool.call({ tool: 'NotebookEdit', notebook_path: '/n.ipynb', new_source: 'x', tool_use_id: 'n' })
  await clock.settle()
  expect(calls).toBe(4)
})

test('asks git for the porcelain status with the branch line', async ($, on) => {
  const asked: (readonly string[])[] = []
  recorder(on)
  on('session.start', () => ({ cwd: '/p' }))
  on('process.run', (_, e) => {
    asked.push(e.argv)

    return ran(0, '## main\n')
  })

  await $.session.start(START)
  expect(asked[0]).toEqual(['git', 'status', '--porcelain=v1', '--branch'])
})

test('falls back to ? when the branch line cannot be read', async ($, on) => {
  const statuses = recorder(on)
  on('session.start', () => ({ cwd: '/p' }))
  on('process.run', () => ran(0, ''))

  await $.session.start(START)
  expect(statuses.at(-1)).toBe('⎇ ? ✓')
})
