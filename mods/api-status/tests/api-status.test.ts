import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'

const START = { cwd: '/project', surface: 'terminal', isInteractive: true } as const
const MINUTE = 60000

type Api = { status: number; body: string; fails: boolean }

const page = (indicator: string, description: string) => JSON.stringify({ status: { indicator, description } })

// The world beneath the mod: a fake status page, and the status line recorded.
const world = (on: On, api: Api) => {
  const status: (string | undefined)[] = []
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('http.fetch', () => {
    if (api.fails) {
      throw new Error('offline')
    }

    return { value: { status: api.status, ok: api.status < 300, headers: {}, text: api.body } }
  })
  on('ui.status', (_$, e) => {
    status.push(e.text)

    return { value: undefined }
  })

  return status
}

const api = (overrides: Partial<Api> = {}): Api => ({
  status: 200,
  body: page('none', 'All Systems Operational'),
  fails: false,
  ...overrides,
})

test('shows a check when all is operational and the incident when it is not', async ($, on) => {
  const clock = mock.clock(on)
  const fake = api()
  const status = world(on, fake)

  await $.session.start(START)
  await clock.settle()
  expect(status.at(-1)).toBe('api ✓')

  fake.body = page('minor', 'Elevated errors on Claude Sonnet')
  await clock.advance(5 * MINUTE)
  expect(status.at(-1)).toBe('api ⚠ Elevated errors on Claude Sonnet')

  fake.body = page('major', 'x'.repeat(100))
  await clock.advance(5 * MINUTE)
  expect(status.at(-1)).toBe(`api ⚠ ${'x'.repeat(60)}`)

  fake.body = page('none', 'All Systems Operational')
  await clock.advance(5 * MINUTE)
  expect(status.at(-1)).toBe('api ✓')
})

const BAD = {
  offline: api({ fails: true }),
  'an error status': api({ status: 502 }),
  'an answer that is not json': api({ body: 'not json' }),
  'an answer without a status': api({ body: '{}' }),
}

for (const [name, bad] of Object.entries(BAD)) {
  test(`shows nothing on ${name}`, async ($, on) => {
    const clock = mock.clock(on)
    const status = world(on, bad)

    await $.session.start(START)
    await clock.settle()
    expect(status.every(text => text === undefined)).toBe(true)
  })
}

test('shows nothing while the hub lists it as off', async ($, on) => {
  const clock = mock.clock(on)
  const status = world(on, api())
  on('state.get', { plugin: 'cockpit', key: 'off' }, () => ({ value: { value: ['api-status'], version: 1 } }))

  await $.session.start(START)
  await clock.settle()
  expect(status.length).toBeGreaterThan(0)
  expect(status.every(text => text === undefined)).toBe(true)
})

test('asks the public Anthropic status page', async ($, on) => {
  const clock = mock.clock(on)
  const urls: string[] = []
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('http.fetch', (_$, e) => {
    urls.push(e.url)

    return { value: { status: 200, ok: true, headers: {}, text: page('none', 'ok') } }
  })
  on('ui.status', () => ({ value: undefined }))

  await $.session.start(START)
  await clock.settle()
  expect(urls).toEqual(['https://status.anthropic.com/api/v2/status.json'])
})

test('falls back to the indicator when there is no description', async ($, on) => {
  const clock = mock.clock(on)
  const status = world(on, api({ body: JSON.stringify({ status: { indicator: 'critical' } }) }))

  await $.session.start(START)
  await clock.settle()
  expect(status.at(-1)).toBe('api ⚠ critical')
})

test('clears the entry when the network drops after a good reading', async ($, on) => {
  const clock = mock.clock(on)
  const fake = api()
  const status = world(on, fake)

  await $.session.start(START)
  await clock.settle()
  expect(status.at(-1)).toBe('api ✓')

  fake.fails = true
  await clock.advance(5 * MINUTE)
  expect(status.at(-1)).toBeUndefined()
})

test('does not ask again before five minutes', async ($, on) => {
  const clock = mock.clock(on)
  let asked = 0
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('http.fetch', () => {
    asked += 1

    return { value: { status: 200, ok: true, headers: {}, text: page('none', 'ok') } }
  })
  on('ui.status', () => ({ value: undefined }))

  await $.session.start(START)
  await clock.settle()
  await clock.advance(4 * MINUTE)
  expect(asked).toBe(1)
  await clock.advance(MINUTE)
  expect(asked).toBe(2)
})

test('the label reads the same in Portuguese and Spanish', async ($, on) => {
  const clock = mock.clock(on)
  const status = world(on, api())
  let lang = 'pt'
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: lang as 'pt', version: 1 } }))

  await $.session.start(START)
  await clock.settle()
  expect(status.at(-1)).toBe('api ✓')

  lang = 'es'
  await clock.advance(5 * MINUTE)
  expect(status.at(-1)).toBe('api ✓')
})
