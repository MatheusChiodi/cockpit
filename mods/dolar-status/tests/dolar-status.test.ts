import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'

const START = { cwd: '/project', surface: 'terminal', isInteractive: true } as const
const MINUTE = 60000

type Api = { status: number; body: string; asked: string[] }

const quote = (bid: string, pctChange: string) => JSON.stringify({ USDBRL: { bid, pctChange } })

// The world beneath the mod: a fake quote service, and the status line recorded.
const world = (on: On, api: Api) => {
  const status: (string | undefined)[] = []
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('http.fetch', (_$, e) => {
    api.asked.push(e.url)

    return { value: { status: api.status, ok: api.status < 300, headers: {}, text: api.body } }
  })
  on('ui.status', (_$, e) => {
    status.push(e.text)

    return { value: undefined }
  })

  return status
}

const api = (overrides: Partial<Api> = {}): Api => ({ status: 200, body: quote('5.4321', '0.52'), asked: [], ...overrides })

test('shows the rate with its trend, and refreshes every 15 minutes', async ($, on) => {
  const clock = mock.clock(on)
  const fake = api()
  const status = world(on, fake)

  await $.session.start(START)
  await clock.settle()
  expect(fake.asked[0]).toContain('USD-BRL')
  expect(status.at(-1)).toBe('usd R$ 5.43 ▲0.52%')

  fake.body = quote('5.40', '-1.1')
  await clock.advance(15 * MINUTE)
  expect(status.at(-1)).toBe('usd R$ 5.40 ▼1.10%')

  fake.body = quote('5.40', '0')
  await clock.advance(15 * MINUTE)
  expect(status.at(-1)).toBe('usd R$ 5.40')
})

test('shows nothing when the network or the answer is no good', async ($, on) => {
  const clock = mock.clock(on)
  const status = world(on, api({ status: 503 }))

  await $.session.start(START)
  await clock.settle()
  expect(status).toEqual([])
})

const BAD = {
  'an html page': api({ body: '<html>oops</html>' }),
  'a bid that is not a number': api({ body: quote('abc', '1') }),
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
  on('state.get', { plugin: 'cockpit', key: 'off' }, () => ({ value: { value: ['dolar-status'], version: 1 } }))

  await $.session.start(START)
  await clock.settle()
  expect(status).toEqual([undefined])
})

test('formats the numbers in the language set in the hub', async ($, on) => {
  const clock = mock.clock(on)
  const status = world(on, api())
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  await $.session.start(START)
  await clock.settle()
  expect(status.at(-1)).toBe('usd R$ 5,43 ▲0,52%')
})
