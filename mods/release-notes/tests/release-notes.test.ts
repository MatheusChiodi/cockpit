import { expect, test } from 'claude-code/testing'

const answer = (on: any, label: () => string) =>
  on('tool.call', { tool: 'AskUserQuestion' }, (_: unknown, e: any) => ({
    result: { questions: e.questions, answers: { [e.questions[0].question]: label() } },
  }))

const run = (args = '') => ({
  command: 'release',
  args,
  origin: { kind: 'composer' } as const,
  presentation: { isFullscreen: true, columns: 120 },
})

const done = (exitCode: number, stdout = '', stderr = '') => ({
  value: { exitCode, stdout, stderr, isStdoutTruncated: false, isStderrTruncated: false },
})

type World = { tag?: string; commits?: string[]; releaseExists?: boolean; ghMissing?: boolean }

const repo = (calls: string[], w: World = {}) => (_: unknown, e: any) => {
  const call = e.argv.join(' ')
  calls.push(call)

  if (e.argv[0] === 'gh' && w.ghMissing) throw new Error('spawn gh ENOENT')
  if (call.includes('rev-parse')) return done(0, 'abc1234\n')
  if (call.includes('describe')) return w.tag === undefined && 'tag' in w ? done(128, '', 'no tags') : done(0, `${w.tag ?? 'v1.4.2'}\n`)
  if (call.includes('log --no-merges')) return done(0, (w.commits ?? ['- add login form (a1b2c3d)', '- fix crash on boot (e4f5a6b)']).join('\n') + '\n')
  if (call.startsWith('gh release view')) return w.releaseExists ? done(0, '{"tagName":"v1.4.3"}') : done(1, '', 'release not found')
  if (call.startsWith('gh release create')) return done(0, 'https://github.com/o/r/releases/tag/v1.4.3\n')

  return done(0)
}

test('shows the notes, asks, and creates the next patch release', async ($, on) => {
  const calls: string[] = []
  on('process.run', repo(calls))
  answer(on, () => 'yes')

  expect((await $.command.run(run())).text).toBe('Release created: https://github.com/o/r/releases/tag/v1.4.3')
  expect(calls).toContain('git --no-pager log --no-merges --format=- %s (%h) v1.4.2..HEAD')
  const create = calls.find(call => call.startsWith('gh release create')) ?? ''
  expect(create).toContain('create v1.4.3 --title v1.4.3')
  expect(create).toContain('- fix crash on boot (e4f5a6b)')
  expect(create).not.toContain('--draft')
})

test('uses the typed tag and can leave a draft', async ($, on) => {
  const calls: string[] = []
  on('process.run', repo(calls))
  answer(on, () => 'as draft')

  await $.command.run(run('v2.0.0'))
  const create = calls.find(call => call.startsWith('gh release create')) ?? ''
  expect(create).toContain('create v2.0.0 --title v2.0.0')
  expect(create).toContain('--draft')
})

test('creates nothing when the person says no', async ($, on) => {
  const calls: string[] = []
  on('process.run', repo(calls))
  answer(on, () => 'no')

  expect((await $.command.run(run())).text).toBe('Cancelled.')
  expect(calls.some(call => call.startsWith('gh release create'))).toBe(false)
})

test('refuses with no commits, an existing release, a bad tag or a non-semver latest tag', async ($, on) => {
  on('process.run', repo([], { commits: [] }))
  expect((await $.command.run(run())).text).toBe('No commits since v1.4.2: nothing to release.')
  expect((await $.command.run(run('--bad'))).text).toBe('Usage: /release [tag]')
})

test('says when the release already exists', async ($, on) => {
  on('process.run', repo([], { releaseExists: true }))
  expect((await $.command.run(run())).text).toBe('A release v1.4.3 already exists.')
})

test('asks for a tag when the latest one is not semver', async ($, on) => {
  on('process.run', repo([], { tag: 'nightly' }))
  expect((await $.command.run(run())).text).toBe('Usage: /release [tag]')
})

test('says one line when gh is missing', async ($, on) => {
  on('process.run', repo([], { ghMissing: true }))
  expect((await $.command.run(run())).text).toContain('GitHub CLI (gh) is missing')
})

test('speaks the language set in the hub', async ($, on) => {
  on('process.run', repo([], { releaseExists: true }))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  expect((await $.command.run(run())).text).toBe('Já existe uma release v1.4.3.')
})
