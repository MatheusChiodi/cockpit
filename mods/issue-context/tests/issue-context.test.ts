import { expect, test } from 'claude-code/testing'

const done = (exitCode: number, stdout = '') => ({
  value: { exitCode, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false },
})

const submit = (text: string, kind: 'composer' | 'api' = 'composer') =>
  ({ text, wait: false, origin: { kind } }) as never

const issue = {
  number: 12,
  title: 'Login fails on Safari',
  state: 'OPEN',
  body: 'Steps:\n1. open Safari\n2. sign in',
  labels: [{ name: 'bug' }, { name: 'p1' }],
}

const seen = (on: any) => {
  const box: { context?: readonly string[] } = {}
  on('prompt.submit', (_: unknown, e: any) => {
    box.context = e.context

    return { text: e.text }
  })

  return box
}

test('attaches the issue the prompt names as hidden context', async ($, on) => {
  const calls: string[] = []
  const box = seen(on)
  on('process.run', (_, e) => {
    calls.push(e.argv.join(' '))

    return done(0, JSON.stringify(issue))
  })

  await $.prompt.submit(submit('please fix issue #12'))
  expect(calls[0]).toBe('gh issue view 12 --json number,title,state,body,labels')
  expect(box.context).toEqual(['GitHub issue #12: Login fails on Safari (open, bug, p1)\nSteps:\n1. open Safari\n2. sign in'])
})

test('reads an issue link, caps the list and truncates a long body', async ($, on) => {
  const calls: string[] = []
  const box = seen(on)
  on('process.run', (_, e) => {
    calls.push(e.argv[3] ?? '')

    return done(0, JSON.stringify({ ...issue, body: 'x'.repeat(4000) }))
  })

  await $.prompt.submit(submit('see https://github.com/o/r/issues/7 and issue 8 and issue 9'))
  expect(calls).toEqual(['7', '8'])
  expect(box.context?.[0]).toContain('… (truncated)')
})

test('leaves other prompts, commands, origins, missing issues and missing gh alone', async ($, on) => {
  const box = seen(on)
  let exitCode = 0
  on('process.run', () => done(exitCode, JSON.stringify(issue)))

  await $.prompt.submit(submit('fix the bug'))
  expect(box.context).toBeUndefined()

  await $.prompt.submit(submit('/issue 12'))
  expect(box.context).toBeUndefined()

  await $.prompt.submit(submit('issue #12', 'api'))
  expect(box.context).toBeUndefined()

  exitCode = 1
  await $.prompt.submit(submit('issue #12'))
  expect(box.context).toBeUndefined()
})
