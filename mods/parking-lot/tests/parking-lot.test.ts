import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'
import type { Engine } from 'claude-code/testing'

const START = { cwd: '/project', surface: 'terminal', isInteractive: true } as const
const DONE = { answer: '', durationMs: 5000, isAborted: false, turnId: 't-1', reason: 'answer' } as const

const park = (args: string) => ({
  command: 'park',
  args,
  origin: { kind: 'composer' } as const,
  presentation: { isFullscreen: true, columns: 120 },
})

// The world beneath the mod: answers the session, the root, the command and the turn, and records every toast.
const world = (on: On, toasts: string[]) => {
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('session.root', () => ({ value: '/project' }))
  on('command.register', (_$, e) => ({ value: { command: e.name } }))
  on('turn.complete', (_$, e) => ({ text: e.answer }))
  on('ui.toast', (_$, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })
}

const run = async ($: Engine, args: string) => (await $.command.run(park(args))).text

test('parks an idea at once and shows it once at the end of the turn', async ($, on) => {
  mock.store(on)
  mock.clock(on)
  const toasts: string[] = []
  world(on, toasts)

  await $.session.start(START)
  expect(await run($, 'add dark mode to settings')).toBe('Parked (1). Back to work.')
  expect(await run($, 'rename the export columns')).toBe('Parked (2). Back to work.')
  expect(toasts).toEqual([])

  await $.turn.complete(DONE)
  expect(toasts).toEqual(['Parked: add dark mode to settings · rename the export columns'])

  // Shown ones are not shown again, a new one is.
  await $.turn.complete(DONE)
  expect(toasts).toHaveLength(1)

  await run($, 'check the cache headers')
  await $.turn.complete(DONE)
  expect(toasts[1]).toBe('Parked: check the cache headers')
})

test('lists, finishes one and clears', async ($, on) => {
  mock.store(on)
  mock.clock(on)
  world(on, [])

  await $.session.start(START)
  expect(await run($, '')).toBe('Nothing parked.')

  await run($, 'first idea')
  await run($, 'second idea')
  expect(await run($, '')).toBe('Parked ideas (2):\n1. first idea\n2. second idea')

  expect(await run($, 'done 1')).toBe('Done: first idea')
  expect(await run($, '')).toBe('Parked ideas (1):\n1. second idea')
  expect(await run($, 'done 5')).toBe('No idea with that number. There are 1.')

  expect(await run($, 'clear')).toBe('Parking lot cleared.')
  expect(await run($, '')).toBe('Nothing parked.')
})

test('stays quiet at the end of a turn with nothing parked, and for a subagent', async ($, on) => {
  mock.store(on)
  mock.clock(on)
  const toasts: string[] = []
  world(on, toasts)

  await $.session.start(START)
  await $.turn.complete(DONE)
  await run($, 'an idea')
  await $.turn.complete({ ...DONE, agentId: 'a1' })

  expect(toasts).toEqual([])
})

test('speaks the language set in the hub', async ($, on) => {
  mock.store(on)
  mock.clock(on)
  const toasts: string[] = []
  world(on, toasts)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  await $.session.start(START)
  expect(await run($, 'modo escuro')).toBe('Guardada (1). De volta ao trabalho.')
  await $.turn.complete(DONE)

  expect(toasts).toEqual(['Guardado: modo escuro'])
})
