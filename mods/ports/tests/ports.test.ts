import { expect, test } from 'claude-code/testing'

const run = {
  command: 'ports',
  args: '',
  origin: { kind: 'composer' } as const,
  presentation: { isFullscreen: true, columns: 120 },
}

// `status` maps a port to the HTTP status that answers there; the other ports refuse.
const listening = (on: any, status: Record<number, number>) =>
  on('http.fetch', (_: unknown, e: { url: string }) => {
    const code = status[Number(new URL(e.url).port)]

    return code === undefined
      ? { deny: 'ECONNREFUSED' }
      : { value: { status: code, ok: code < 300, headers: {}, text: '' } }
  })

test('lists the ports that answer, with their status', async ($, on) => {
  listening(on, { 3000: 200, 8080: 404 })

  expect((await $.command.run(run)).text).toBe('● 3000  200\n● 8080  404\n2 of 9 ports answer')
})

test('says so when nothing answers', async ($, on) => {
  listening(on, {})

  expect((await $.command.run(run)).text).toBe('No dev port answers on localhost.')
})

test('probes every common dev port', async ($, on) => {
  const asked: string[] = []
  on('http.fetch', (_: unknown, e: { url: string }) => {
    asked.push(new URL(e.url).port)

    return { deny: 'ECONNREFUSED' }
  })

  await $.command.run(run)
  expect(asked.sort()).toEqual(['19006', '3000', '3001', '4200', '5000', '5173', '8000', '8080', '8081'])
})

test('speaks the language set in the hub', async ($, on) => {
  listening(on, { 5173: 200 })
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  expect((await $.command.run(run)).text).toContain('1 de 9 portas respondem')
})
