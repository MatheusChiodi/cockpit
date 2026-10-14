import { expect, mock, test } from 'claude-code/testing'

const NOW = new Date(2026, 9, 13, 15, 42).getTime()

const run = () => ({
  command: 'standup',
  args: '',
  origin: { kind: 'composer' } as const,
  presentation: { isFullscreen: true, columns: 120 },
})

const done = (exitCode: number, stdout: string, stderr = '') => ({
  value: { exitCode, stdout, stderr, isStdoutTruncated: false, isStderrTruncated: false },
})

const LOG = ['2026-10-13\tsplit settings pane', '2026-10-12\tadd retry to uploads', '2026-10-12\tfix login redirect'].join('\n')

test('groups your commits by day, oldest first, and copies them', async ($, on) => {
  mock.clock(on, { now: NOW })
  const asked: (readonly string[])[] = []
  const copied: string[] = []
  on('process.run', (_, e) => {
    asked.push(e.argv)

    return e.argv[1] === 'config' ? done(0, 'me@example.com\n') : done(0, LOG)
  })
  on('ui.copy', (_, e) => {
    copied.push(e.text)

    return { value: { isCopied: true } }
  })

  const answer = await $.command.run(run())
  const expected = [
    '2026-10-12 (yesterday)',
    '- fix login redirect',
    '- add retry to uploads',
    '',
    '2026-10-13 (today)',
    '- split settings pane',
  ].join('\n')

  expect(answer.text).toBe(`${expected}\n\nCopied to the clipboard.`)
  expect(copied[0]).toBe(expected)

  const log = asked[1] ?? []
  expect(log).toContain('--since=2026-10-12 00:00')
  expect(log).toContain('--author=me@example.com')
  expect(log).toContain('--fixed-strings')
})

test('says so when there is nothing, no email or no repository', async ($, on) => {
  mock.clock(on, { now: NOW })
  let mode: 'none' | 'email' | 'repo' = 'none'
  on('process.run', (_, e) => {
    if (e.argv[1] === 'config') {
      return mode === 'email' ? done(1, '') : done(0, 'me@example.com\n')
    }

    return mode === 'repo' ? done(128, '', 'fatal: not a git repository\nhint') : done(0, '')
  })

  expect((await $.command.run(run())).text).toBe('No commits of yours since 2026-10-12 00:00.')

  mode = 'email'
  expect((await $.command.run(run())).text).toContain('git has no user.email')

  mode = 'repo'
  expect((await $.command.run(run())).text).toBe('Could not read the git history: fatal: not a git repository')
})

test('speaks the language set in the hub', async ($, on) => {
  mock.clock(on, { now: NOW })
  on('process.run', (_, e) => (e.argv[1] === 'config' ? done(0, 'me@example.com') : done(0, LOG)))
  on('ui.copy', () => ({ value: { isCopied: true } }))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  const answer = await $.command.run(run())
  expect(answer.text).toContain('2026-10-12 (ontem)')
  expect(answer.text).toContain('2026-10-13 (hoje)')
})
