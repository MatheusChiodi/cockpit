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
  on('process.run', (_: unknown, e: { argv: readonly string[] }) => {
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

// The same repository with some git calls answered otherwise, by the start of their arguments.
const repoWith = (on: any, calls: string[], overrides: Record<string, object>) =>
  on('process.run', (_: unknown, e: { argv: readonly string[] }) => {
    const args = e.argv.slice(2).join(' ')
    calls.push(args)
    const hit = Object.keys(overrides).find(start => args.startsWith(start))

    if (hit !== undefined) return overrides[hit] as ReturnType<typeof done>
    if (args.startsWith('log')) return done(0, 'a1b2c3d fix login redirect\n')
    if (args.startsWith('branch')) return done(0, '')

    return done(0)
  })

test('says git is missing when it cannot start', async ($, on) => {
  on('process.run', () => ({ deny: 'spawn git ENOENT' }))

  expect((await $.command.run(run)).text).toBe('git not found or not a repository.')
})

test('refuses the first commit and an empty repository', async ($, on) => {
  const calls: string[] = []
  let overrides: Record<string, object> = { 'rev-parse': done(1) }
  on('process.run', (_: unknown, e: { argv: readonly string[] }) => {
    const args = e.argv.slice(2).join(' ')
    calls.push(args)
    const hit = Object.keys(overrides).find(start => args.startsWith(start))

    if (hit !== undefined) return overrides[hit] as ReturnType<typeof done>
    if (args.startsWith('log')) return done(0, 'a1b2c3d init\n')

    return done(0)
  })

  expect((await $.command.run(run)).text).toBe('No commit to undo.')

  overrides = { log: done(128) }
  expect((await $.command.run(run)).text).toBe('No commit to undo.')
  expect(calls.some(call => call.startsWith('reset'))).toBe(false)
})

test('stops when the remote branches cannot be listed', async ($, on) => {
  const calls: string[] = []
  repoWith(on, calls, { branch: done(129) })
  answer(on, 'yes')

  expect((await $.command.run(run)).text).toBe('git not found or not a repository.')
  expect(calls.some(call => call.startsWith('reset'))).toBe(false)
})

test('reports the first line of a refused reset', async ($, on) => {
  repoWith(on, [], {
    reset: { value: { exitCode: 1, stdout: '', stderr: 'fatal: index.lock exists\nhint', isStdoutTruncated: false, isStderrTruncated: false } },
  })
  answer(on, 'yes')

  expect((await $.command.run(run)).text).toBe('git refused: fatal: index.lock exists')
})

test('asks with the commit and undoes it in Portuguese', async ($, on) => {
  const questions: string[] = []
  repo(on, [])
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))
  on('tool.call', { tool: 'AskUserQuestion' }, (_: unknown, e: any) => {
    questions.push(e.questions[0].question)

    return { result: { questions: e.questions, answers: { [e.questions[0].question]: 'sim' } } }
  })

  expect((await $.command.run(run)).text).toBe('Desfeito: a1b2c3d fix login redirect')
  expect(questions).toEqual(['Desfazer a1b2c3d fix login redirect? As mudanças ficam staged.'])
})
