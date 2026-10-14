import { expect, mock, test } from 'claude-code/testing'

const START = { cwd: '/repo', surface: null, isInteractive: true } as const
const DAY = 86400000
const NOW = Date.UTC(2026, 9, 13)

const done = (exitCode: number, stdout = '') => ({
  value: { exitCode, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false },
})

const ago = (days: number) => new Date(NOW - days * DAY).toISOString()

const world = (on: any, gh: { exitCode: number; stdout: string }, lang = 'en') => {
  const clock = mock.clock(on, { now: NOW })
  const toasts: string[] = []
  on('session.start', (_: unknown, e: any) => ({ cwd: e.cwd }))
  on('process.run', () => done(gh.exitCode, gh.stdout))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: lang, version: 1 } }))
  on('ui.toast', (_: unknown, e: { text: string }) => {
    toasts.push(e.text)

    return { value: undefined }
  })

  return { clock, toasts }
}

const drafts = (...rows: [number, string, number][]) =>
  JSON.stringify(rows.map(([number, title, days]) => ({ number, title, updatedAt: ago(days) })))

const started = async ($: any, clock: { advance: (ms: number) => Promise<void> }) => {
  await $.session.start(START)
  await clock.advance(1)
}

test('nags about the oldest stale draft once, with a count of the others', async ($, on) => {
  const { clock, toasts } = world(on, { exitCode: 0, stdout: drafts([37, 'Refactor billing', 5], [40, 'WIP search', 4], [41, 'Fresh', 1]) })

  await started($, clock)
  expect(toasts).toEqual(['#37 "Refactor billing" has been a draft for 5 days. Ready for review? (+1 more draft(s))'])

  await clock.advance(6 * 3600000)
  expect(toasts).toHaveLength(1)
})

test('says nothing for fresh drafts, no drafts, or no gh', async ($, on) => {
  const gh = { exitCode: 0, stdout: drafts([41, 'Fresh', 2]) }
  const { clock, toasts } = world(on, gh)

  await started($, clock)
  expect(toasts).toEqual([])

  gh.stdout = '[]'
  await clock.advance(6 * 3600000)
  gh.exitCode = 1
  await clock.advance(6 * 3600000)
  expect(toasts).toEqual([])
})

test('speaks the language set in the hub', async ($, on) => {
  const { clock, toasts } = world(on, { exitCode: 0, stdout: drafts([37, 'Refactor billing', 5]) }, 'pt')

  await started($, clock)
  expect(toasts).toEqual(['#37 "Refactor billing" está como rascunho há 5 dias. Pronto para revisão?'])
})
