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
