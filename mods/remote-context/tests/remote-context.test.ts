import { expect, test } from 'claude-code/testing'

const INPUT = { model: 'claude-test', promptModel: 'claude-test', surfaces: ['terminal'], tools: [], outputStyle: null, traits: [] } as never

const ran = (exitCode: number, stdout: string) => ({
  value: { exitCode, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false },
})

// `git` answers by its arguments, read live from `answers` (keyed by the arguments joined with a space).
const repo = (on: any, answers: Record<string, string>) => {
  on('process.run', (_: unknown, e: { argv: string[] }) => {
    const answer = answers[e.argv.slice(1).join(' ')]

    return answer === undefined ? ran(1, '') : ran(0, answer)
  })
  on('prompt.compose', () => ({ sections: [{ id: 'other', text: 'kept', scope: 'session' as const }] }))
  on('tool.call', { tool: 'Bash' }, () => ({ result: undefined as never }))
}

const composed = async ($: any): Promise<{ id: string; text: string }[]> => (await $.prompt.compose(INPUT)).sections

const bash = ($: any, command: string) => $.tool.call({ tool: 'Bash', command, tool_use_id: command })

test('tells the default branch and the remotes, without credentials', async ($, on) => {
  const leak = `ghp_${'a1B2'.repeat(9)}`
  repo(on, {
    'remote -v': `origin\thttps://me:${leak}@github.com/acme/billing.git (fetch)\norigin\thttps://me:${leak}@github.com/acme/billing.git (push)\nupstream\tgit@github.com:other/billing.git (fetch)\n`,
    'symbolic-ref --short refs/remotes/origin/HEAD': 'origin/develop\n',
  })

  const sections = await composed($)
  expect(sections.map(s => s.id)).toEqual(['other', 'remote-context:remote'])

  const text = sections[1]!.text
  expect(text).toContain('- Default branch: develop')
  expect(text).toContain('- Remote origin: https://github.com/acme/billing.git')
  expect(text).toContain('- Remote upstream: git@github.com:other/billing.git')
  expect(text).not.toContain(leak)
  expect(text).not.toContain('me:')
})

test('falls back to a local main when the remote has no HEAD', async ($, on) => {
  repo(on, {
    'remote -v': 'origin\tgit@github.com:acme/x.git (fetch)\n',
    'rev-parse --verify --quiet refs/heads/main': 'abc\n',
  })

  expect((await composed($))[1]!.text).toContain('- Default branch: main')
})

test('reads once and refreshes after a git remote command', async ($, on) => {
  const answers: Record<string, string> = { 'remote -v': 'origin\tgit@h:a/one.git (fetch)\n' }
  repo(on, answers)

  expect((await composed($))[1]!.text).toContain('a/one')

  answers['remote -v'] = 'origin\tgit@h:a/two.git (fetch)\n'
  expect((await composed($))[1]!.text).toContain('a/one')

  await bash($, 'git remote set-url origin git@h:a/two.git')
  expect((await composed($))[1]!.text).toContain('a/two')
})

test('adds nothing outside a repository or without remotes', async ($, on) => {
  repo(on, {})
  expect((await composed($)).map(s => s.id)).toEqual(['other'])
})

test('leaves the default branch out when none can be found', async ($, on) => {
  repo(on, { 'remote -v': 'origin\tgit@h:a/x.git (fetch)\n' })

  const text = (await composed($))[1]!.text
  expect(text).toBe('# Git remote\n- Remote origin: git@h:a/x.git')
})

test('asks the HEAD of the only remote when there is no origin', async ($, on) => {
  repo(on, {
    'remote -v': 'fork\thttps://example.com/me/x.git (fetch)\n',
    'symbolic-ref --short refs/remotes/fork/HEAD': 'fork/trunk\n',
  })

  const text = (await composed($))[1]!.text
  expect(text).toContain('- Default branch: trunk')
  expect(text).toContain('- Remote fork: https://example.com/me/x.git')
})

test('adds nothing when the listing has no fetch lines', async ($, on) => {
  repo(on, { 'remote -v': 'origin\tgit@h:a/x.git (push)\n' })

  expect((await composed($)).map(s => s.id)).toEqual(['other'])
})

test('keeps the cached text after other or denied git commands, and refreshes after PowerShell git fetch', async ($, on) => {
  const answers: Record<string, string> = { 'remote -v': 'origin\tgit@h:a/one.git (fetch)\n' }
  on('process.run', (_: unknown, e: { argv: readonly string[] }) => {
    const answer = answers[e.argv.slice(1).join(' ')]

    return answer === undefined ? ran(1, '') : ran(0, answer)
  })
  on('prompt.compose', () => ({ sections: [{ id: 'other', text: 'kept', scope: 'session' as const }] }))
  on('tool.call', { tool: 'PowerShell' }, () => ({ result: undefined as never }))
  on('tool.call', { tool: 'Bash' }, (_: unknown, e: { command: string }) =>
    e.command.includes('denied') ? { deny: 'no' } : { result: undefined as never },
  )

  expect((await composed($))[1]!.text).toContain('a/one')
  answers['remote -v'] = 'origin\tgit@h:a/two.git (fetch)\n'

  await bash($, 'git status')
  expect((await composed($))[1]!.text).toContain('a/one')
  expect((await bash($, 'git remote add denied x')).deny).toBe('no')
  expect((await composed($))[1]!.text).toContain('a/one')

  await $.tool.call({ tool: 'PowerShell', command: 'git fetch --prune origin', tool_use_id: 'ps' })
  expect((await composed($))[1]!.text).toContain('a/two')
})
