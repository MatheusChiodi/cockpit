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
