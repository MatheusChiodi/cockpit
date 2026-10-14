import { expect, test } from 'claude-code/testing'

// Stands in for the person at the AskUserQuestion dialog that $.ui.ask opens.
const answer = (on: any, label: () => string) =>
  on('tool.call', { tool: 'AskUserQuestion' }, (_: unknown, e: any) => ({
    result: { questions: e.questions, answers: { [e.questions[0].question]: label() } },
  }))

const run = (args: string) => ({
  command: 'fixup',
  args,
  origin: { kind: 'composer' } as const,
  presentation: { isFullscreen: true, columns: 120 },
})

const done = (exitCode: number, stdout = '', stderr = '') => ({
  value: { exitCode, stdout, stderr, isStdoutTruncated: false, isStderrTruncated: false },
})

test('refuses when nothing is staged', async ($, on) => {
  on('process.run', () => done(0))

  expect((await $.command.run(run(''))).text).toContain('Nothing is staged')
})

test('creates the fixup only after the person says yes', async ($, on) => {
  const calls: string[] = []
  on('process.run', (_, e) => {
    const call = e.argv.slice(2).join(' ')
    calls.push(call)

    return call.startsWith('diff') ? done(1) : call.startsWith('log') ? done(0, 'abc1234 add login\n') : done(0)
  })
  let label = 'no'
  answer(on, () => label)

  expect((await $.command.run(run('abc1234'))).text).toBe('Cancelled.')
  expect(calls.some(call => call.startsWith('commit'))).toBe(false)

  label = 'yes'
  const text = (await $.command.run(run('abc1234'))).text
  expect(text).toContain('Fixup created for abc1234 add login')
  expect(calls).toContain('commit --fixup=abc1234')
})

test('defaults to HEAD and reports an unknown commit', async ($, on) => {
  const calls: string[] = []
  on('process.run', (_, e) => {
    const call = e.argv.slice(2).join(' ')
    calls.push(call)

    return call.startsWith('diff') ? done(1) : done(128, '', 'bad revision')
  })

  expect((await $.command.run(run(''))).text).toBe('No such commit: HEAD')
  expect((await $.command.run(run('zzz'))).text).toBe('No such commit: zzz')
})

test('speaks the language set in the hub', async ($, on) => {
  on('process.run', () => done(0))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  expect((await $.command.run(run(''))).text).toContain('Nada no stage')
})
