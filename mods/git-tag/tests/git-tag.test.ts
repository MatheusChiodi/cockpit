import { expect, test } from 'claude-code/testing'

// Stands in for the person at the AskUserQuestion dialog that $.ui.ask opens.
const answer = (on: any, label: () => string) =>
  on('tool.call', { tool: 'AskUserQuestion' }, (_: unknown, e: any) => ({
    result: { questions: e.questions, answers: { [e.questions[0].question]: label() } },
  }))

const run = (args: string) => ({
  command: 'gtag',
  args,
  origin: { kind: 'composer' } as const,
  presentation: { isFullscreen: true, columns: 120 },
})

const done = (exitCode: number, stdout = '', stderr = '') => ({
  value: { exitCode, stdout, stderr, isStdoutTruncated: false, isStderrTruncated: false },
})

// A repository whose latest tag is `tag` (none when undefined), `commits` commits behind HEAD.
const repo = (calls: string[], tag: string | undefined, commits: number) => (_: unknown, e: any) => {
  const call = e.argv.slice(2).join(' ')
  calls.push(call)

  if (call.startsWith('log')) return done(0, 'abc1234 add login\n')
  if (call.startsWith('describe')) return tag === undefined ? done(128, '', 'no tags') : done(0, `${tag}\n`)
  if (call.startsWith('rev-list')) return done(0, `${commits}\n`)

  return done(0)
}

test('shows the latest tag and the commits since', async ($, on) => {
  on('process.run', repo([], 'v1.2.3', 4))

  expect((await $.command.run(run(''))).text).toBe('Latest tag v1.2.3, 4 commit(s) since')
})

test('bumps patch, minor and major after the person says yes', async ($, on) => {
  const calls: string[] = []
  on('process.run', repo(calls, 'v1.2.3', 4))
  answer(on, () => 'yes')

  expect((await $.command.run(run('patch'))).text).toContain('Tag v1.2.4 created')
  expect((await $.command.run(run('minor'))).text).toContain('Tag v1.3.0 created')
  expect((await $.command.run(run('major'))).text).toContain('Tag v2.0.0 created')
  expect(calls).toContain('tag -a v1.2.4 -m v1.2.4')
})

test('creates nothing when the person says no', async ($, on) => {
  const calls: string[] = []
  on('process.run', repo(calls, 'v1.2.3', 4))
  answer(on, () => 'no')

  expect((await $.command.run(run('patch'))).text).toBe('Cancelled.')
  expect(calls.some(call => call.startsWith('tag'))).toBe(false)
})

test('says when HEAD is already tagged', async ($, on) => {
  on('process.run', repo([], 'v1.2.3', 0))

  expect((await $.command.run(run('patch'))).text).toBe('HEAD is already tagged v1.2.3.')
})

test('handles no tags', async ($, on) => {
  on('process.run', repo([], undefined, 0))

  expect((await $.command.run(run(''))).text).toContain('No tags yet')
})

test('rejects a non-semver tag and bad usage', async ($, on) => {
  on('process.run', repo([], 'release-7', 2))

  expect((await $.command.run(run('patch'))).text).toContain('is not vMAJOR.MINOR.PATCH')
  expect((await $.command.run(run('huge'))).text).toBe('Usage: /gtag [patch|minor|major]')
})

test('speaks the language set in the hub', async ($, on) => {
  on('process.run', repo([], 'v1.0.0', 2))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  expect((await $.command.run(run(''))).text).toBe('Última tag v1.0.0, 2 commit(s) depois')
})

test('says when the folder is not a git repository', async ($, on) => {
  const calls: string[] = []
  on('process.run', (_: unknown, e: any) => {
    calls.push(e.argv.slice(2).join(' '))

    return done(128, '', 'fatal: not a git repository')
  })

  expect((await $.command.run(run('patch'))).text).toBe('Not a git repository (or git is not available).')
  expect(calls).toHaveLength(1)
})

test('offers v0.0.1 on a repository without tags, asking on the HEAD commit', async ($, on) => {
  const calls: string[] = []
  const questions: string[] = []
  on('process.run', repo(calls, undefined, 0))
  on('tool.call', { tool: 'AskUserQuestion' }, (_: unknown, e: any) => {
    questions.push(e.questions[0].question)

    return { result: { questions: e.questions, answers: { [e.questions[0].question]: 'yes' } } }
  })

  expect((await $.command.run(run('MINOR'))).text).toContain('Tag v0.0.1 created.')
  expect(questions).toEqual(['Create annotated tag v0.0.1 on "abc1234 add login"?'])
  expect(calls).toContain('tag -a v0.0.1 -m v0.0.1')
})

test('reports the first line of a failed git tag', async ($, on) => {
  on('process.run', (_: unknown, e: any) => {
    const call = e.argv.slice(2).join(' ')

    if (call.startsWith('tag')) return done(128, '', "fatal: tag 'v1.2.4' already exists\nmore")

    return repo([], 'v1.2.3', 1)(_, e)
  })
  answer(on, () => 'yes')

  expect((await $.command.run(run('patch'))).text).toBe("git failed: fatal: tag 'v1.2.4' already exists")
})

test('cancels when the question cannot be asked', async ($, on) => {
  const calls: string[] = []
  on('process.run', repo(calls, 'v1.2.3', 4))
  on('tool.call', { tool: 'AskUserQuestion' }, () => ({ deny: 'not interactive' }))

  expect((await $.command.run(run('patch'))).text).toBe('Cancelled.')
  expect(calls.some(call => call.startsWith('tag'))).toBe(false)
})

test('treats a partial version as not semver', async ($, on) => {
  on('process.run', repo([], 'v1.2', 3))

  expect((await $.command.run(run('major'))).text).toBe('Latest tag "v1.2" is not vMAJOR.MINOR.PATCH; tag it by hand.')
})

test('accepts the Portuguese yes', async ($, on) => {
  on('process.run', repo([], 'v1.0.9', 2))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))
  answer(on, () => 'sim')

  expect((await $.command.run(run('patch'))).text).toContain('Tag v1.0.10 criada.')
})

test('speaks Spanish when the hub is set to es', async ($, on) => {
  on('process.run', repo([], undefined, 0))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  expect((await $.command.run(run(''))).text).toBe('Aún no hay tags. Próxima: /gtag patch crea v0.0.1.')
  expect((await $.command.run(run('x'))).text).toBe('Uso: /gtag [patch|minor|major]')
})
