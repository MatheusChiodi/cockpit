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

test('speaks Spanish when the hub is set to es', async ($, on) => {
  world(on, view({ isDraft: true, reviewDecision: 'REVIEW_REQUIRED' }))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  expect((await $.command.run(run())).text?.split('\n')).toEqual([
    'PR #42  ✗ no está listo',
    '  ✗ sigue como borrador',
    '  ✓ sin conflictos',
    '  ✓ checks pasando',
    '  … revisión necesaria',
  ])
})

test('says closed in Portuguese and Spanish for a closed pull request', async ($, on) => {
  world(on, view({ state: 'CLOSED' }))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  expect((await $.command.run(run())).text).toBe('PR #42  já está fechado')
})

test('passes the number to gh, with or without a leading #', async ($, on) => {
  const calls: (readonly string[])[] = []
  on('process.run', (_: unknown, e: { argv: readonly string[] }) => {
    calls.push(e.argv)

    return done(0, JSON.stringify(view({})))
  })

  await $.command.run(run('#7'))
  await $.command.run(run(''))
  expect(calls[0]?.slice(0, 4)).toEqual(['gh', 'pr', 'view', '7'])
  expect(calls[1]?.slice(0, 4)).toEqual(['gh', 'pr', 'view', '--json'])
})

test('says the one gh line when gh fails or answers something that is not JSON', async ($, on) => {
  let answer = done(1, '', 'no pull requests found')
  on('process.run', () => answer)

  expect((await $.command.run(run())).text).toContain('GitHub CLI (gh) is missing')

  answer = done(0, 'not json')
  expect((await $.command.run(run())).text).toContain('GitHub CLI (gh) is missing')
})

test('a pull request without checks or required review is ready', async ($, on) => {
  world(on, { number: 9, state: 'OPEN', isDraft: false, mergeable: 'MERGEABLE' })

  expect((await $.command.run(run())).text?.split('\n')).toEqual([
    'PR #9  ✓ ready to merge',
    '  ✓ no conflicts',
    '  ✓ checks passing',
    '  ✓ no review required',
  ])
})

test('a failing check outweighs a running one', async ($, on) => {
  world(
    on,
    view({
      statusCheckRollup: [{ status: 'IN_PROGRESS' }, { status: 'COMPLETED', conclusion: 'TIMED_OUT' }, { state: 'ERROR' }],
    }),
  )

  const text = (await $.command.run(run())).text ?? ''
  expect(text).toContain('✗ 2 check(s) failing')
  expect(text).not.toContain('running')
})
