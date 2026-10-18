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

// Something is staged and the target exists; `commit` answers the commit call.
const staged = (on: any, commit: ReturnType<typeof done>, calls: string[] = []) =>
  on('process.run', (_: unknown, e: { argv: readonly string[] }) => {
    const call = e.argv.slice(2).join(' ')
    calls.push(call)

    return call.startsWith('diff') ? done(1) : call.startsWith('log') ? done(0, 'abc1234 add login\n') : commit
  })

test('says git is missing when it cannot start', async ($, on) => {
  on('process.run', () => {
    throw new Error('spawn git ENOENT')
  })

  expect((await $.command.run(run(''))).text).toBe('Not a git repository (or git is not available).')
})

test('reports the first line of what git said when the commit fails', async ($, on) => {
  staged(on, done(1, '', 'error: pre-commit hook failed\ndetails'))
  answer(on, () => 'yes')

  expect((await $.command.run(run(''))).text).toBe('git failed: error: pre-commit hook failed')
})

test('uses only the first word as the target', async ($, on) => {
  const calls: string[] = []
  staged(on, done(0), calls)
  answer(on, () => 'yes')

  await $.command.run(run('  abc1234 extra words '))
  expect(calls).toContain('log -1 --format=%h %s abc1234 --')
  expect(calls).toContain('commit --fixup=abc1234')
})

test('cancels when the question cannot be asked', async ($, on) => {
  const calls: string[] = []
  staged(on, done(0), calls)
  on('tool.call', { tool: 'AskUserQuestion' }, () => ({ deny: 'not interactive' }))

  expect((await $.command.run(run(''))).text).toBe('Cancelled.')
  expect(calls.some(call => call.startsWith('commit'))).toBe(false)
})

test('speaks Portuguese: asks in Portuguese and confirms with "sim"', async ($, on) => {
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))
  staged(on, done(0))
  let question = ''
  on('tool.call', { tool: 'AskUserQuestion' }, (_: unknown, e: any) => {
    question = e.questions[0].question

    return { result: { questions: e.questions, answers: { [question]: 'sim' } } }
  })

  expect((await $.command.run(run(''))).text).toBe('Fixup criado para abc1234 add login. Junte com: git rebase -i --autosquash <base>')
  expect(question).toBe('Criar um commit fixup de "abc1234 add login" com o que está no stage?')
})

test('speaks Spanish when the hub says so', async ($, on) => {
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))
  let stagedNothing = true
  on('process.run', (_, e) => {
    const call = e.argv.slice(2).join(' ')

    if (call.startsWith('diff')) {
      return done(stagedNothing ? 0 : 1)
    }

    return call.startsWith('log') ? done(128, '', 'bad') : done(0)
  })

  expect((await $.command.run(run(''))).text).toBe('Nada en el stage. Agrega los cambios primero (/stage).')
  stagedNothing = false
  expect((await $.command.run(run('zzz'))).text).toBe('Commit inexistente: zzz')
})
