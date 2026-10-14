import { expect, mock, test } from 'claude-code/testing'

const answer = (on: any, label: () => string) =>
  on('tool.call', { tool: 'AskUserQuestion' }, (_: unknown, e: any) => ({
    result: { questions: e.questions, answers: { [e.questions[0].question]: label() } },
  }))

const run = (args = '') => ({
  command: 'changelog',
  args,
  origin: { kind: 'composer' } as const,
  presentation: { isFullscreen: true, columns: 120 },
})

const done = (exitCode: number, stdout = '', stderr = '') => ({
  value: { exitCode, stdout, stderr, isStdoutTruncated: false, isStderrTruncated: false },
})

// 2026-10-13 in milliseconds since the epoch.
const NOW = Date.UTC(2026, 9, 13)

const world = (on: any, commits: string[], file: string | undefined, tag = 'v1.4.2') => {
  const written: string[] = []
  mock.clock(on, { now: NOW })
  on('session.root', () => ({ value: '/repo' }))
  on('process.run', (_: unknown, e: any) => {
    const call = e.argv.join(' ')

    if (call.includes('rev-parse')) return done(0, 'abc1234\n')
    if (call.includes('describe')) return done(0, `${tag}\n`)

    return done(0, commits.join('\n') + '\n')
  })
  on('fs.read', () => {
    if (file === undefined) throw new Error('ENOENT')

    return { value: file }
  })
  on('fs.write', (_: unknown, e: { text: string }) => {
    written.push(e.text)

    return { value: undefined }
  })

  return written
}

const COMMITS = ['feat(auth): login form', 'fix: crash on boot', 'chore: bump deps']

test('writes the next minor entry above the newest one, after asking', async ($, on) => {
  const written = world(on, COMMITS, '# Changelog\n\n## [1.4.2] - 2026-09-01\n\n### Fixed\n\n- old\n')
  answer(on, () => 'yes')

  expect((await $.command.run(run())).text).toBe('CHANGELOG.md now has the entry for 1.5.0.')
  expect(written[0]).toBe(
    '# Changelog\n\n## [1.5.0] - 2026-10-13\n\n### Added\n\n- login form\n\n### Fixed\n\n- crash on boot\n\n### Changed\n\n- bump deps\n\n## [1.4.2] - 2026-09-01\n\n### Fixed\n\n- old\n',
  )
})

test('bumps patch for fixes only and major for a breaking change', async ($, on) => {
  const written = world(on, ['fix: typo'], '# Changelog\n')
  answer(on, () => 'yes')
  await $.command.run(run())
  expect(written[0]).toContain('## [1.4.3] - 2026-10-13')
  expect(written[0]).toBe('# Changelog\n\n## [1.4.3] - 2026-10-13\n\n### Fixed\n\n- typo\n')
})

test('bumps major on a breaking commit and creates the file when missing', async ($, on) => {
  const written = world(on, ['feat!: drop v1 api'], undefined)
  answer(on, () => 'yes')

  await $.command.run(run())
  expect(written[0]).toBe('# Changelog\n\n## [2.0.0] - 2026-10-13\n\n### Added\n\n- drop v1 api\n')
})

test('uses the typed version and writes nothing when the person says no', async ($, on) => {
  const written = world(on, COMMITS, '# Changelog\n')
  answer(on, () => 'no')

  expect((await $.command.run(run('v3.0.0'))).text).toBe('Cancelled.')
  expect(written).toEqual([])
})

test('refuses a repeated version, bad usage and no commits', async ($, on) => {
  world(on, COMMITS, '# Changelog\n\n## [1.5.0] - 2026-10-01\n')
  expect((await $.command.run(run())).text).toBe('CHANGELOG.md already has an entry for 1.5.0.')
  expect((await $.command.run(run('soon'))).text).toBe('Usage: /changelog [version]')
})

test('says when there is nothing since the last tag', async ($, on) => {
  world(on, [], '# Changelog\n')
  expect((await $.command.run(run())).text).toBe('No commits since v1.4.2: nothing to add.')
})

test('says one line outside a repository', async ($, on) => {
  on('process.run', () => done(128, '', 'not a git repository'))
  expect((await $.command.run(run())).text).toBe('Not a git repository (or git is not available).')
})

test('speaks the language set in the hub', async ($, on) => {
  world(on, [], '# Changelog\n')
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  expect((await $.command.run(run())).text).toBe('Nenhum commit desde v1.4.2: nada para adicionar.')
})
