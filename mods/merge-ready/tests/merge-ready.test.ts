import { expect, test } from 'claude-code/testing'

const run = (args = '') => ({
  command: 'ready',
  args,
  origin: { kind: 'composer' } as const,
  presentation: { isFullscreen: true, columns: 120 },
})

const done = (exitCode: number, stdout = '', stderr = '') => ({
  value: { exitCode, stdout, stderr, isStdoutTruncated: false, isStderrTruncated: false },
})

const pass = { __typename: 'CheckRun', name: 'lint', status: 'COMPLETED', conclusion: 'SUCCESS' }

const view = (extra: object) => ({
  number: 42,
  state: 'OPEN',
  isDraft: false,
  mergeable: 'MERGEABLE',
  reviewDecision: 'APPROVED',
  statusCheckRollup: [pass],
  ...extra,
})

const world = (on: any, pr: object) => on('process.run', () => done(0, JSON.stringify(pr)))

test('says ready when nothing blocks the merge', async ($, on) => {
  world(on, view({}))

  expect((await $.command.run(run())).text?.split('\n')).toEqual([
    'PR #42  ✓ ready to merge',
    '  ✓ no conflicts',
    '  ✓ checks passing',
    '  ✓ approved',
  ])
})

test('lists every blocker', async ($, on) => {
  world(
    on,
    view({
      isDraft: true,
      mergeable: 'CONFLICTING',
      reviewDecision: 'CHANGES_REQUESTED',
      statusCheckRollup: [pass, { name: 'unit', status: 'COMPLETED', conclusion: 'FAILURE' }, { state: 'FAILURE', context: 'ci/x' }],
    }),
  )

  const lines = (await $.command.run(run())).text?.split('\n')
  expect(lines).toEqual([
    'PR #42  ✗ not ready',
    '  ✗ still a draft',
    '  ✗ conflicts with the base branch',
    '  ✗ 2 check(s) failing',
    '  ✗ changes requested',
  ])
})

test('counts running checks and a required review as waiting', async ($, on) => {
  world(
    on,
    view({
      mergeable: 'UNKNOWN',
      reviewDecision: 'REVIEW_REQUIRED',
      statusCheckRollup: [{ name: 'e2e', status: 'IN_PROGRESS', conclusion: '' }, { state: 'PENDING', context: 'ci/y' }],
    }),
  )

  const text = (await $.command.run(run())).text ?? ''
  expect(text).toContain('PR #42  ✗ not ready')
  expect(text).toContain('… 2 check(s) running')
  expect(text).toContain('… review required')
  expect(text).toContain('… mergeability not computed yet')
})

test('reports a merged pull request and rejects a bad argument', async ($, on) => {
  world(on, view({ state: 'MERGED' }))

  expect((await $.command.run(run('42'))).text).toBe('PR #42  already merged')
  expect((await $.command.run(run('abc'))).text).toBe('Usage: /ready [number]')
})

test('says one line when gh is missing', async ($, on) => {
  on('process.run', () => {
    throw new Error('spawn gh ENOENT')
  })

  expect((await $.command.run(run())).text).toContain('GitHub CLI (gh) is missing')
})

test('speaks the language set in the hub', async ($, on) => {
  world(on, view({}))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  expect((await $.command.run(run())).text).toContain('PR #42  ✓ pronto para mesclar')
})
