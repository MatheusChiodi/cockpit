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
