import { expect, test } from 'claude-code/testing'

const run = {
  command: 'checks',
  args: '',
  origin: { kind: 'composer' } as const,
  presentation: { isFullscreen: true, columns: 120 },
}

const done = (exitCode: number, stdout = '', stderr = '') => ({
  value: { exitCode, stdout, stderr, isStdoutTruncated: false, isStderrTruncated: false },
})

const checks = [
  { name: 'lint', bucket: 'pass', link: 'https://x/1' },
  { name: 'build', bucket: 'pass', link: 'https://x/2' },
  { name: 'unit-tests', bucket: 'fail', link: 'https://github.com/o/r/actions/runs/91' },
  { name: 'e2e', bucket: 'pending', link: 'https://x/4' },
]

test('summarises the checks and lists the failed and running ones', async ($, on) => {
  on('process.run', (_, e) =>
    e.argv.includes('checks') ? done(1, JSON.stringify(checks)) : done(0, JSON.stringify({ number: 42 })),
  )

  const lines = (await $.command.run(run)).text?.split('\n')
  expect(lines?.[0]).toBe('PR #42  ✓ 2 passed  ✗ 1 failed  … 1 running')
  expect(lines?.[1]).toBe('  ✗ unit-tests  https://github.com/o/r/actions/runs/91')
  expect(lines?.[2]).toBe('  … e2e')
})

test('says when the pull request has no checks', async ($, on) => {
  on('process.run', (_, e) => (e.argv.includes('checks') ? done(0, '[]') : done(0, '{"number":7}')))

  expect((await $.command.run(run)).text).toBe('PR #7  no checks reported')
})

test('says one line when gh is missing', async ($, on) => {
  on('process.run', () => {
    throw new Error('spawn gh ENOENT')
  })
  expect((await $.command.run(run)).text).toContain('GitHub CLI (gh) is missing')
})

test('says one line when there is no pull request', async ($, on) => {
  on('process.run', () => done(1, '', 'no pull requests found'))
  expect((await $.command.run(run)).text).toContain('GitHub CLI (gh) is missing')
})

test('speaks the language set in the hub', async ($, on) => {
  on('process.run', (_, e) => (e.argv.includes('checks') ? done(0, '[]') : done(0, '{"number":7}')))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  expect((await $.command.run(run)).text).toBe('PR #7  nenhum check reportado')
})

test('speaks Spanish when the hub is set to es', async ($, on) => {
  on('process.run', (_, e) =>
    e.argv.includes('checks') ? done(1, JSON.stringify(checks)) : done(0, JSON.stringify({ number: 42 })),
  )
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  expect((await $.command.run(run)).text?.split('\n')[0]).toBe('PR #42  ✓ 2 pasaron  ✗ 1 fallaron  … 1 en curso')
})

test('speaks Portuguese in the summary line', async ($, on) => {
  on('process.run', (_, e) =>
    e.argv.includes('checks') ? done(1, JSON.stringify(checks)) : done(0, JSON.stringify({ number: 42 })),
  )
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  expect((await $.command.run(run)).text?.split('\n')[0]).toBe('PR #42  ✓ 2 passaram  ✗ 1 falharam  … 1 em andamento')
})

test('counts a cancelled check as failed and lists failures before running ones', async ($, on) => {
  const list = [
    { name: 'e2e', bucket: 'pending' },
    { name: 'deploy', bucket: 'cancel' },
    { name: 'skipped', bucket: 'skipping' },
  ]
  on('process.run', (_, e) => (e.argv.includes('checks') ? done(1, JSON.stringify(list)) : done(0, '{"number":3}')))

  expect((await $.command.run(run)).text?.split('\n')).toEqual(['PR #3  ✓ 1 passed  ✗ 1 failed  … 1 running', '  ✗ deploy', '  … e2e'])
})

test('lists at most twelve rows', async ($, on) => {
  const list = Array.from({ length: 15 }, (_, i) => ({ name: `job${i}`, bucket: 'fail' }))
  on('process.run', (_, e) => (e.argv.includes('checks') ? done(1, JSON.stringify(list)) : done(0, '{"number":3}')))

  const lines = (await $.command.run(run)).text?.split('\n') ?? []
  expect(lines[0]).toBe('PR #3  ✓ 0 passed  ✗ 15 failed  … 0 running')
  expect(lines.length).toBe(13)
})

test('a checks answer that is not JSON reads as no checks', async ($, on) => {
  on('process.run', (_, e) => (e.argv.includes('checks') ? done(1, 'no checks reported on the branch') : done(0, '{"number":5}')))

  expect((await $.command.run(run)).text).toBe('PR #5  no checks reported')
})

test('does not ask for checks when there is no pull request', async ($, on) => {
  const calls: string[] = []
  on('process.run', (_, e) => {
    calls.push(e.argv.join(' '))

    return done(0, '{}')
  })

  expect((await $.command.run(run)).text).toContain('GitHub CLI (gh) is missing')
  expect(calls).toEqual(['gh pr view --json number'])
})
