import { expect, test } from 'claude-code/testing'

const run = {
  command: 'gundo',
  args: '',
  origin: { kind: 'composer' } as const,
  presentation: { isFullscreen: true, columns: 120 },
}

// Stands in for the person at the AskUserQuestion dialog that $.ui.ask opens.
const answer = (on: any, label: string) =>
  on('tool.call', { tool: 'AskUserQuestion' }, (_: unknown, e: any) => ({
    result: { questions: e.questions, answers: { [e.questions[0].question]: label } },
  }))

const done = (exitCode: number, stdout = '') => ({
  value: { exitCode, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false },
})

// Answers each git call the command makes; `remotes` is what `branch -r --contains` prints.
const repo = (on: any, calls: string[], remotes = '') =>
  on('process.run', (_: unknown, e: { argv: string[] }) => {
    const args = e.argv.slice(2).join(' ')
    calls.push(args)

    if (args.startsWith('log')) return done(0, 'a1b2c3d fix login redirect\n')
    if (args.startsWith('branch')) return done(0, remotes)

    return done(0)
  })

test('undoes the last commit with a soft reset once confirmed', async ($, on) => {
  const calls: string[] = []
  repo(on, calls)
  answer(on, 'yes')

  const result = await $.command.run(run)
  expect(result.text).toBe('Undone: a1b2c3d fix login redirect')
  expect(calls.at(-1)).toBe('reset --soft HEAD~1')
})

test('does nothing when the person says no', async ($, on) => {
  const calls: string[] = []
  repo(on, calls)
  answer(on, 'no')

  expect((await $.command.run(run)).text).toBe('Cancelled.')
  expect(calls.some(call => call.startsWith('reset'))).toBe(false)
})

test('treats a dismissed question as no', async ($, on) => {
  const calls: string[] = []
  repo(on, calls)
  on('tool.call', { tool: 'AskUserQuestion' }, () => ({ deny: 'dismissed' }))

  expect((await $.command.run(run)).text).toBe('Cancelled.')
  expect(calls.some(call => call.startsWith('reset'))).toBe(false)
})

test('refuses a commit that is already pushed', async ($, on) => {
  const calls: string[] = []
  repo(on, calls, '  origin/main\n')
  answer(on, 'yes')

  expect((await $.command.run(run)).text).toBe('Refused: a1b2c3d fix login redirect is already pushed.')
  expect(calls.some(call => call.startsWith('reset'))).toBe(false)
})

test('speaks the language set in the hub', async ($, on) => {
  repo(on, [], '  origin/main\n')
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  expect((await $.command.run(run)).text).toContain('Rechazado')
})
