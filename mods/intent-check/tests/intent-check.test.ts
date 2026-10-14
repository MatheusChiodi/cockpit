import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'
import type { Engine, MockClock } from 'claude-code/testing'

const START = { cwd: '/project', surface: 'terminal', isInteractive: true } as const
const MINUTE = 60000

const run = (args: string) => ({
  command: 'intent',
  args,
  origin: { kind: 'composer' } as const,
  presentation: { isFullscreen: true, columns: 120 },
})

// Works for `minutes`, sending a prompt every five of them.
const work = async ($: Engine, clock: MockClock, minutes: number) => {
  for (let spent = 0; spent < minutes; spent += 5) {
    await $.prompt.submit({ text: 'go', wait: false, origin: { kind: 'composer' } })
    await clock.advance(Math.min(5, minutes - spent) * MINUTE)
  }
}

// The world beneath the mod: answers the session, the root, the prompt and the command, and records every toast.
const world = (on: On, toasts: string[]) => {
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('session.root', () => ({ value: '/project' }))
  on('command.register', (_$, e) => ({ value: { command: e.name } }))
  on('prompt.submit', (_$, e) => ({ text: e.text }))
  on('ui.toast', (_$, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })
}

test('asks every 30 minutes of use whether you are still on it', async ($, on) => {
  mock.store(on)
  const clock = mock.clock(on)
  const toasts: string[] = []
  world(on, toasts)

  await $.session.start(START)
  expect((await $.command.run(run('migrate the auth tests'))).text).toBe('Intent set: migrate the auth tests')

  await work($, clock, 25)
  expect(toasts).toHaveLength(0)

  await work($, clock, 40)
  expect(toasts).toEqual(['Still on: migrate the auth tests?', 'Still on: migrate the auth tests?'])
})

test('says nothing without an intent, after clear, or with nobody there', async ($, on) => {
  mock.store(on)
  const clock = mock.clock(on)
  const toasts: string[] = []
  world(on, toasts)

  await $.session.start(START)
  await work($, clock, 65)
  expect(toasts).toHaveLength(0)

  await $.command.run(run('ship the release'))
  expect((await $.command.run(run(''))).text).toBe('Intent: ship the release')
  await clock.advance(300 * MINUTE)
  expect(toasts).toHaveLength(0)

  expect((await $.command.run(run('clear'))).text).toBe('Intent cleared.')
  expect((await $.command.run(run(''))).text).toContain('No intent set')
  await work($, clock, 65)
  expect(toasts).toHaveLength(0)
})

test('an intent kept in the store is taken up by the next session, unless it is stale', async ($, on) => {
  mock.store(on, { 'intent:/project': { text: 'fix the cache', at: 0 } })
  const clock = mock.clock(on, { now: 60 * MINUTE })
  const toasts: string[] = []
  world(on, toasts)

  await $.session.start(START)
  await work($, clock, 35)
  expect(toasts).toEqual(['Still on: fix the cache?'])
})

test('an intent from another day is not taken up', async ($, on) => {
  mock.store(on, { 'intent:/project': { text: 'old work', at: 0 } })
  const clock = mock.clock(on, { now: 24 * 60 * MINUTE })
  const toasts: string[] = []
  world(on, toasts)

  await $.session.start(START)
  await work($, clock, 35)

  expect(toasts).toHaveLength(0)
})

test('speaks the language set in the hub', async ($, on) => {
  mock.store(on)
  const clock = mock.clock(on)
  const toasts: string[] = []
  world(on, toasts)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  await $.session.start(START)
  await $.command.run(run('corrigir o login'))
  await work($, clock, 35)

  expect(toasts).toEqual(['Ainda em: corrigir o login?'])
})
