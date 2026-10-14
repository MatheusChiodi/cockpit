import { expect, test } from 'claude-code/testing'

const run = {
  command: 'prcomments',
  args: '',
  origin: { kind: 'composer' } as const,
  presentation: { isFullscreen: true, columns: 120 },
}

const done = (exitCode: number, stdout = '', stderr = '') => ({
  value: { exitCode, stdout, stderr, isStdoutTruncated: false, isStderrTruncated: false },
})

const pr = JSON.stringify({ number: 42, author: { login: 'me' } })

const comments = [
  { id: 1, in_reply_to_id: null, user: { login: 'ana' }, path: 'src/login.ts', line: 18, body: 'Should this trim the email?' },
  { id: 2, in_reply_to_id: null, user: { login: 'bruno' }, path: 'src/api.ts', line: null, original_line: 90, body: 'This swallows\nthe error.' },
  { id: 3, in_reply_to_id: null, user: { login: 'ana' }, path: 'src/a.ts', line: 3, body: 'Already handled' },
  { id: 4, in_reply_to_id: 3, user: { login: 'me' }, path: 'src/a.ts', line: 3, body: 'Done' },
  { id: 5, in_reply_to_id: null, user: { login: 'me' }, path: 'src/b.ts', line: 1, body: 'my own note' },
]

const world = (on: any, list: unknown[]) =>
  on('process.run', (_: unknown, e: any) => (e.argv[1] === 'api' ? done(0, JSON.stringify(list)) : done(0, pr)))

test('lists only the threads that wait for the author', async ($, on) => {
  world(on, comments)

  const lines = (await $.command.run(run)).text?.split('\n')
  expect(lines).toEqual([
    'PR #42  2 comment(s) waiting for you',
    '  ana  src/login.ts:18  Should this trim the email?',
    '  bruno  src/api.ts:90  This swallows the error.',
  ])
})

test('says when nothing waits', async ($, on) => {
  world(on, [])
  expect((await $.command.run(run)).text).toBe('PR #42  no review comments waiting for you')
})

test('caps a long list', async ($, on) => {
  world(
    on,
    Array.from({ length: 13 }, (_, i) => ({ id: i + 10, in_reply_to_id: null, user: { login: 'ana' }, path: 'f', line: i, body: 'x' })),
  )

  const lines = (await $.command.run(run)).text?.split('\n') ?? []
  expect(lines).toHaveLength(12)
  expect(lines.at(-1)).toBe('  … and 3 more')
})

test('says one line when gh is missing', async ($, on) => {
  on('process.run', () => {
    throw new Error('spawn gh ENOENT')
  })

  expect((await $.command.run(run)).text).toContain('GitHub CLI (gh) is missing')
})

test('speaks the language set in the hub', async ($, on) => {
  world(on, [])
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  expect((await $.command.run(run)).text).toBe('PR #42  nenhum comentário de revisão esperando você')
})
