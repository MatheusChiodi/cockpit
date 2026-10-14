import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'

const START = { cwd: '/project', surface: 'terminal', isInteractive: true } as const
const MINUTE = 60000

type Api = { status: number; body: string; fails: boolean }

// The world beneath the mod: a fake weather service, and the status line recorded.
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

const api = (overrides: Partial<Api> = {}): Api => ({ status: 200, body: 'London: ☀️ +18°C\n', fails: false, ...overrides })

test('shows the forecast line and refreshes every 30 minutes', async ($, on) => {
  const clock = mock.clock(on)
  const fake = api()
  const status = world(on, fake)

  await $.session.start(START)
  await clock.settle()
  expect(status.at(-1)).toBe('London: ☀️ 18°C')

  fake.body = 'London: 🌧 +12°C'
  await clock.advance(30 * MINUTE)
  expect(status.at(-1)).toBe('London: 🌧 12°C')
})

const BAD = {
  offline: api({ fails: true }),
  'an error status': api({ status: 500 }),
  'an html page': api({ body: '<html><body>error</body></html>' }),
  'a line too long': api({ body: 'x'.repeat(80) }),
  'an empty line': api({ body: '  ' }),
}

for (const [name, bad] of Object.entries(BAD)) {
  test(`shows nothing on ${name}`, async ($, on) => {
    const clock = mock.clock(on)
    const status = world(on, bad)

    await $.session.start(START)
    await clock.settle()
    expect(status).toEqual([])
  })
}

test('shows nothing while the hub lists it as off', async ($, on) => {
  const clock = mock.clock(on)
  const status = world(on, api())
  on('state.get', { plugin: 'cockpit', key: 'off' }, () => ({ value: { value: ['weather-status'], version: 1 } }))

  await $.session.start(START)
  await clock.settle()
  expect(status).toEqual([undefined])
})
