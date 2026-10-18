import { expect, mock, test } from 'claude-code/testing'

const START = { cwd: '/repo', surface: null, isInteractive: true } as const

const MIN = 60000

const done = (stdout: string, exitCode = 0) => ({
  value: { exitCode, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false },
})

// A repository on feat/x whose origin/main is `behind` commits ahead.
const repo = (state: { behind: number; branch: string }) => (_: unknown, e: any) => {
  const call = e.argv.slice(2).join(' ')

  if (call.startsWith('symbolic-ref')) return done('origin/main\n')
  if (call === 'rev-parse --abbrev-ref HEAD') return done(`${state.branch}\n`)

  return done(`${state.behind}\n`)
}

test('warns once per ten commits of distance, and again only when it grows', async ($, on) => {
  const clock = mock.clock(on)
  const toasts: string[] = []
  const state = { behind: 4, branch: 'feat/x' }
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('process.run', repo(state))
  on('ui.toast', (_, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })

  await $.session.start(START)
  await clock.advance(15 * MIN)
  expect(toasts).toEqual([])

  state.behind = 12
  await clock.advance(15 * MIN)
  expect(toasts).toEqual(['feat/x is 12 commits behind origin/main. Sync soon (/sync) before the conflicts grow.'])

  await clock.advance(15 * MIN)
  expect(toasts).toHaveLength(1)

  state.behind = 25
  await clock.advance(15 * MIN)
  expect(toasts).toHaveLength(2)
})

test('stays silent on the base branch, and speaks the hub language', async ($, on) => {
  const clock = mock.clock(on)
  const toasts: string[] = []
  const state = { behind: 30, branch: 'main' }
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('process.run', repo(state))
  on('ui.toast', (_, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  await $.session.start(START)
  await clock.advance(15 * MIN)
  expect(toasts).toEqual([])

  state.branch = 'feat/y'
  await clock.advance(15 * MIN)
  expect(toasts[0]).toContain('feat/y está 30 commits atrás de origin/main')
})

const world = (on: any, process: (_: unknown, e: any) => unknown) => {
  const toasts: string[] = []
  on('session.start', (_: unknown, e: any) => ({ cwd: e.cwd }))
  on('process.run', process)
  on('ui.toast', (_: unknown, e: { text: string }) => {
    toasts.push(e.text)

    return { value: undefined }
  })

  return toasts
}

test('checks at session start, before the first interval', async ($, on) => {
  const clock = mock.clock(on)
  const toasts = world(on, repo({ behind: 11, branch: 'feat/x' }))

  await $.session.start(START)
  await clock.settle()
  expect(toasts).toHaveLength(1)
})

test('warns again after the branch caught up and fell behind again', async ($, on) => {
  const clock = mock.clock(on)
  const state = { behind: 15, branch: 'feat/x' }
  const toasts = world(on, repo(state))

  await $.session.start(START)
  await clock.settle()
  state.behind = 0
  await clock.advance(15 * MIN)
  state.behind = 10
  await clock.advance(15 * MIN)
  expect(toasts).toHaveLength(2)
  expect(toasts[1]).toContain('is 10 commits behind')
})

test('uses origin/HEAD as the base and falls back to origin/main', async ($, on) => {
  const clock = mock.clock(on)
  const calls: string[] = []
  let hasHead = true
  const toasts = world(on, (_: unknown, e: any) => {
    const call = e.argv.slice(2).join(' ')
    calls.push(call)

    if (call.startsWith('symbolic-ref')) return hasHead ? done('origin/develop\n') : done('', 128)
    if (call === 'rev-parse --abbrev-ref HEAD') return done('feat/x\n')

    return done('20\n')
  })

  await $.session.start(START)
  await clock.settle()
  expect(calls).toContain('rev-list --count HEAD..origin/develop')
  expect(toasts[0]).toContain('behind origin/develop')

  hasHead = false
  await clock.advance(15 * MIN)
  expect(calls).toContain('rev-list --count HEAD..origin/main')
})

test('stays silent on a detached HEAD, outside a repository and on unreadable counts', async ($, on) => {
  const clock = mock.clock(on)
  let mode = 'detached'
  const toasts = world(on, (_: unknown, e: any) => {
    const call = e.argv.slice(2).join(' ')

    if (mode === 'none') throw new Error('spawn git ENOENT')
    if (call.startsWith('symbolic-ref')) return done('origin/main\n')
    if (call === 'rev-parse --abbrev-ref HEAD') return done(mode === 'detached' ? 'HEAD\n' : 'feat/x\n')

    return done('lots\n')
  })

  await $.session.start(START)
  await clock.settle()
  mode = 'none'
  await clock.advance(15 * MIN)
  mode = 'garbage'
  await clock.advance(15 * MIN)
  expect(toasts).toEqual([])
})

test('speaks Spanish from the hub', async ($, on) => {
  const clock = mock.clock(on)
  const toasts = world(on, repo({ behind: 42, branch: 'feat/z' }))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  await $.session.start(START)
  await clock.settle()
  expect(toasts[0]).toBe('feat/z está 42 commits detrás de origin/main. Sincroniza pronto (/sync) antes de que los conflictos crezcan.')
})
