import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'

const cmd = { command: 'projspend', args: '', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 80 } } as const

const measure = (usd: number | undefined) => ({
  context: { window: 200000 },
  rateLimits: [],
  ...(usd === undefined ? {} : { cost: { usd } }),
  changed: ['cost' as const],
})

// The world beneath the mod: the project root and the session id, which the test moves.
const world = (on: On, session: { id: string; root: string }) => {
  on('session.measure', (_$, e) => ({ changed: e.changed }))
  on('session.id', () => ({ value: session.id }))
  on('session.root', () => ({ value: session.root }))
}

test('sums the sessions of the project and splits this one from the earlier', async ($, on) => {
  mock.store(on)
  const session = { id: 's1', root: '/work/shop' }
  world(on, session)

  await $.session.measure(measure(1))
  await $.session.measure(measure(1.5))
  session.id = 's2'
  await $.session.measure(measure(0.75))

  expect((await $.command.run(cmd)).text).toBe(
    ['Project spend: US$ 2.25 in 2 sessions', 'This session: US$ 0.75', 'Earlier sessions: US$ 1.50'].join('\n'),
  )
})

test('keeps each project apart and says so when there is no cost', async ($, on) => {
  mock.store(on)
  const session = { id: 's1', root: '/work/shop' }
  world(on, session)

  await $.session.measure(measure(undefined))
  expect((await $.command.run(cmd)).text).toBe('No cost recorded for this project yet.')

  await $.session.measure(measure(4))
  session.root = '/work/blog'
  expect((await $.command.run(cmd)).text).toBe('No cost recorded for this project yet.')
})

test('speaks the language set in the hub', async ($, on) => {
  mock.store(on)
  world(on, { id: 's1', root: '/work/shop' })
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  await $.session.measure(measure(2))
  expect((await $.command.run(cmd)).text).toBe(
    ['Gasto do projeto: US$ 2.00 em 1 sessão', 'Esta sessão: US$ 2.00', 'Sessões anteriores: US$ 0.00'].join('\n'),
  )
})

test('reads the earlier sessions kept in the store, before this one costs anything', async ($, on) => {
  mock.store(on, { 'project:/work/shop': { old1: 3, old2: 1.25 } })
  world(on, { id: 's9', root: '/work/shop' })

  expect((await $.command.run(cmd)).text).toBe(
    ['Project spend: US$ 4.25 in 2 sessions', 'This session: US$ 0.00', 'Earlier sessions: US$ 4.25'].join('\n'),
  )
})

test('adds this session to what the store already holds', async ($, on) => {
  mock.store(on, { 'project:/work/shop': { old1: 1 } })
  world(on, { id: 's2', root: '/work/shop' })

  await $.session.measure(measure(0.5))
  expect((await $.command.run(cmd)).text).toBe(
    ['Project spend: US$ 1.50 in 2 sessions', 'This session: US$ 0.50', 'Earlier sessions: US$ 1.00'].join('\n'),
  )
})

test('a zero cost or a broken record counts as nothing', async ($, on) => {
  mock.store(on, { 'project:/work/blog': 'broken' })
  const session = { id: 's1', root: '/work/shop' }
  world(on, session)

  await $.session.measure(measure(0))
  expect((await $.command.run(cmd)).text).toBe('No cost recorded for this project yet.')

  session.root = '/work/blog'
  expect((await $.command.run(cmd)).text).toBe('No cost recorded for this project yet.')
})

test('speaks Spanish when the hub is set to es', async ($, on) => {
  mock.store(on, { 'project:/work/shop': { old1: 1 } })
  world(on, { id: 's2', root: '/work/shop' })
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  await $.session.measure(measure(2))
  expect((await $.command.run(cmd)).text).toBe(
    ['Gasto del proyecto: US$ 3.00 en 2 sesiones', 'Esta sesión: US$ 2.00', 'Sesiones anteriores: US$ 1.00'].join('\n'),
  )
})
