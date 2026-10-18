import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'

const START = { cwd: '/project', surface: 'terminal', isInteractive: true } as const
const HOUR = 3600000
const DAY = 24 * HOUR

// The world beneath the mod: answers the session, the root and the prompt, and records every toast.
const world = (on: On, toasts: string[]) => {
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('session.root', () => ({ value: '/project' }))
  on('prompt.submit', (_$, e) => ({ text: e.text }))
  on('ui.toast', (_$, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })
}

test('keeps the last real prompt and tells it at the next start', async ($, on) => {
  mock.store(on)
  const clock = mock.clock(on, { now: 10 * DAY })
  const toasts: string[] = []
  world(on, toasts)

  await $.session.start(START)
  expect(toasts).toEqual([])

  await $.prompt.submit({ text: 'fix the login redirect after logout', wait: false, origin: { kind: 'composer' } })
  await $.prompt.submit({ text: 'ok go on', wait: false, origin: { kind: 'composer' } })
  await clock.advance(DAY + 2 * HOUR)

  await $.session.start(START)
  expect(toasts).toEqual(['Last time (yesterday): fix the login redirect after logout'])
})

test('says minutes and hours for recent work, and cuts a long prompt', async ($, on) => {
  const long = `refactor the invoice export so that finance can pick the columns ${'and more '.repeat(10)}`
  mock.store(on, { 'resume:/project': { text: 'rename the export columns', at: 10 * DAY } })
  const clock = mock.clock(on, { now: 10 * DAY + 20 * 60000 })
  const toasts: string[] = []
  world(on, toasts)

  await $.session.start(START)
  expect(toasts).toEqual(['Last time (20 min ago): rename the export columns'])

  await $.prompt.submit({ text: long, wait: false, origin: { kind: 'composer' } })
  await clock.advance(5 * HOUR)
  await $.session.start(START)

  expect(toasts[1]?.startsWith('Last time (5 h ago): refactor the invoice export')).toBe(true)
  expect(toasts[1]?.endsWith('…')).toBe(true)
})

test('stays quiet with nothing kept, after three days, or in a non-interactive run', async ($, on) => {
  mock.store(on, { 'resume:/project': { text: 'old work from last week', at: 0 } })
  mock.clock(on, { now: 4 * DAY })
  const toasts: string[] = []
  world(on, toasts)

  await $.session.start(START)
  await $.session.start({ ...START, isInteractive: false })
  expect(toasts).toEqual([])
})

test('speaks the language set in the hub', async ($, on) => {
  mock.store(on, { 'resume:/project': { text: 'corrigir o login', at: 10 * DAY } })
  mock.clock(on, { now: 10 * DAY + 3 * HOUR })
  const toasts: string[] = []
  world(on, toasts)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  await $.session.start(START)

  expect(toasts).toEqual(['Da última vez (há 3 h): corrigir o login'])
})

test('speaks Spanish when the hub is set to es', async ($, on) => {
  mock.store(on, { 'resume:/project': { text: 'arreglar el login', at: 10 * DAY } })
  mock.clock(on, { now: 12 * DAY + HOUR })
  const toasts: string[] = []
  world(on, toasts)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  await $.session.start(START)

  expect(toasts).toEqual(['La última vez (hace 2 días): arreglar el login'])
})

test('rounds a few seconds up to one minute and says yesterday in Portuguese', async ($, on) => {
  mock.store(on, { 'resume:/project': { text: 'corrigir o login', at: 10 * DAY } })
  const clock = mock.clock(on, { now: 10 * DAY + 10000 })
  const toasts: string[] = []
  world(on, toasts)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  await $.session.start(START)
  await clock.set(11 * DAY + HOUR)
  await $.session.start(START)

  expect(toasts).toEqual(['Da última vez (há 1 min): corrigir o login', 'Da última vez (ontem): corrigir o login'])
})

test('does not keep slash commands, and folds whitespace', async ($, on) => {
  mock.store(on)
  const clock = mock.clock(on, { now: 10 * DAY })
  const toasts: string[] = []
  world(on, toasts)

  await $.prompt.submit({ text: '  write   the\n\nrelease notes  ', wait: false, origin: { kind: 'composer' } })
  await $.prompt.submit({ text: '/compact keep the important parts', wait: false, origin: { kind: 'composer' } })
  await clock.advance(2 * HOUR)
  await $.session.start(START)

  expect(toasts).toEqual(['Last time (2 h ago): write the release notes'])
})

test('keeps one line per project', async ($, on) => {
  mock.store(on, { 'resume:/elsewhere': { text: 'work in another repo', at: 10 * DAY } })
  mock.clock(on, { now: 10 * DAY + HOUR })
  const toasts: string[] = []
  world(on, toasts)

  await $.session.start(START)

  expect(toasts).toEqual([])
})

test('stays quiet when the kept line is from the future', async ($, on) => {
  mock.store(on, { 'resume:/project': { text: 'clock skew happened here', at: 10 * DAY } })
  mock.clock(on, { now: 9 * DAY })
  const toasts: string[] = []
  world(on, toasts)

  await $.session.start(START)

  expect(toasts).toEqual([])
})
