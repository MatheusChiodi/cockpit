import { expect, test } from 'claude-code/testing'

const answer = (on: any, label: () => string) =>
  on('tool.call', { tool: 'AskUserQuestion' }, (_: unknown, e: any) => ({
    result: { questions: e.questions, answers: { [e.questions[0].question]: label() } },
  }))

const run = (args = '') => ({
  command: 'prnew',
  args,
  origin: { kind: 'composer' } as const,
  presentation: { isFullscreen: true, columns: 120 },
})

const done = (exitCode: number, stdout = '', stderr = '') => ({
  value: { exitCode, stdout, stderr, isStdoutTruncated: false, isStderrTruncated: false },
})

type World = { branch?: string; existing?: unknown[]; upstream?: boolean; subjects?: string[]; ghMissing?: boolean }

const repo = (calls: string[], w: World = {}) => (_: unknown, e: any) => {
  const call = e.argv.join(' ')
  calls.push(call)

  if (e.argv[0] === 'gh' && w.ghMissing) throw new Error('spawn gh ENOENT')
  if (call.includes('rev-parse --abbrev-ref HEAD')) return done(0, `${w.branch ?? 'feat/login-form'}\n`)
  if (call.startsWith('gh pr list')) return done(0, JSON.stringify(w.existing ?? []))
  if (call.includes('symbolic-ref')) return done(0, 'origin/main\n')
  if (call.includes('@{u}')) return w.upstream === false ? done(128, '', 'no upstream') : done(0, 'origin/feat\n')
  if (call.includes('log --reverse')) return done(0, (w.subjects ?? ['add login form', 'validate email']).join('\n') + '\n')
  if (call.startsWith('gh pr create')) return done(0, 'https://github.com/o/r/pull/7\n')

  return done(0)
}

test('asks and creates the pull request from the commits', async ($, on) => {
  const calls: string[] = []
  on('process.run', repo(calls))
  answer(on, () => 'yes')

  expect((await $.command.run(run())).text).toBe('Pull request opened: https://github.com/o/r/pull/7')
  const create = calls.find(call => call.startsWith('gh pr create')) ?? ''
  expect(create).toContain('--title Login form')
  expect(create).toContain('- add login form')
  expect(create).not.toContain('--draft')
})

test('uses the single commit subject and opens as draft', async ($, on) => {
  const calls: string[] = []
  on('process.run', repo(calls, { subjects: ['fix crash on boot'] }))
  answer(on, () => 'as draft')

  await $.command.run(run())
  const create = calls.find(call => call.startsWith('gh pr create')) ?? ''
  expect(create).toContain('--title fix crash on boot')
  expect(create).toContain('--draft')
})

test('uses the typed title', async ($, on) => {
  const calls: string[] = []
  on('process.run', repo(calls))
  answer(on, () => 'yes')

  await $.command.run(run('My title'))
  expect(calls.find(call => call.startsWith('gh pr create'))).toContain('--title My title')
})

test('creates nothing when the person says no', async ($, on) => {
  const calls: string[] = []
  on('process.run', repo(calls))
  answer(on, () => 'no')

  expect((await $.command.run(run())).text).toBe('Cancelled.')
  expect(calls.some(call => call.startsWith('gh pr create'))).toBe(false)
})

test('refuses on the base branch', async ($, on) => {
  on('process.run', repo([], { branch: 'main' }))
  expect((await $.command.run(run())).text).toContain('base branch')
})

test('says when a pull request already exists', async ($, on) => {
  on('process.run', repo([], { existing: [{ number: 4, url: 'https://github.com/o/r/pull/4' }] }))
  expect((await $.command.run(run())).text).toBe('Pull request #4 already exists: https://github.com/o/r/pull/4')
})

test('asks to push first and reports no commits', async ($, on) => {
  on('process.run', repo([], { upstream: false }))
  expect((await $.command.run(run())).text).toBe('Push the branch first: git push -u origin feat/login-form')
})

test('says one line when gh is missing', async ($, on) => {
  on('process.run', repo([], { ghMissing: true }))
  expect((await $.command.run(run())).text).toContain('GitHub CLI (gh) is missing')
})

test('speaks the language set in the hub', async ($, on) => {
  on('process.run', repo([], { existing: [{ number: 4, url: 'u' }] }))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  expect((await $.command.run(run())).text).toBe('O pull request #4 já existe: u')
})

test('reports no commits ahead of the base', async ($, on) => {
  on('process.run', repo([], { subjects: [] }))
  expect((await $.command.run(run())).text).toBe('No commits ahead of main: nothing to open a pull request for.')
})

test('reports the first line of what gh said when create fails', async ($, on) => {
  const inner = repo([])
  on('process.run', (_: unknown, e: any) =>
    e.argv.join(' ').startsWith('gh pr create') ? done(1, '', 'GraphQL: base branch not found\nmore detail') : inner(_, e),
  )
  answer(on, () => 'yes')

  expect((await $.command.run(run())).text).toBe('gh failed: GraphQL: base branch not found')
})

test('takes the base from origin/HEAD', async ($, on) => {
  const calls: string[] = []
  const inner = repo(calls)
  on('process.run', (_: unknown, e: any) => (e.argv.join(' ').includes('symbolic-ref') ? done(0, 'origin/develop\n') : inner(_, e)))
  answer(on, () => 'yes')

  await $.command.run(run())
  expect(calls).toContain('git --no-pager log --reverse --format=%s origin/develop..HEAD')
  expect(calls.find(call => call.startsWith('gh pr create'))).toContain('--base develop')
})

test('falls back to main when origin/HEAD is unset and refuses on it', async ($, on) => {
  const inner = repo([], { branch: 'main' })
  on('process.run', (_: unknown, e: any) => (e.argv.join(' ').includes('symbolic-ref') ? done(1, '', 'not a symbolic ref') : inner(_, e)))

  expect((await $.command.run(run())).text).toBe('You are on main, the base branch: switch to a feature branch first.')
})

test('outside a repository it says gh or the repo is missing', async ($, on) => {
  on('process.run', (_: unknown, e: any) => (e.argv[0] === 'git' ? done(128, '', 'not a git repository') : done(0, '[]')))

  expect((await $.command.run(run())).text).toContain('GitHub CLI (gh) is missing')
})

test('an unreadable pr list is treated as no pull request', async ($, on) => {
  const inner = repo([])
  on('process.run', (_: unknown, e: any) => (e.argv.join(' ').startsWith('gh pr list') ? done(0, 'not json') : inner(_, e)))
  answer(on, () => 'no')

  expect((await $.command.run(run())).text).toBe('Cancelled.')
})

test('the Portuguese draft answer opens a draft', async ($, on) => {
  const calls: string[] = []
  on('process.run', repo(calls))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))
  answer(on, () => 'como rascunho')

  expect((await $.command.run(run())).text).toBe('Pull request aberto: https://github.com/o/r/pull/7')
  expect(calls.find(call => call.startsWith('gh pr create'))).toContain('--draft')
})

test('speaks Spanish from the hub', async ($, on) => {
  on('process.run', repo([], { upstream: false }))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  expect((await $.command.run(run())).text).toContain('Sube la rama primero:')
})
