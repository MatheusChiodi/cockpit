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

test('lists open ports in the fixed order and pads the five-digit one', async ($, on) => {
  listening(on, { 19006: 200, 3001: 500, 5173: 301 })

  expect((await $.command.run(run)).text).toBe('● 3001  500\n● 5173  301\n● 19006 200\n3 of 9 ports answer')
})

test('asks plain http on localhost at the root path', async ($, on) => {
  const urls: string[] = []
  on('http.fetch', (_: unknown, e: { url: string }) => {
    urls.push(e.url)

    return { deny: 'ECONNREFUSED' }
  })

  await $.command.run(run)
  expect(urls).toContain('http://localhost:3000/')
  expect(urls.every(url => /^http:\/\/localhost:\d+\/$/.test(url))).toBe(true)
})

test('counts every port when all of them answer', async ($, on) => {
  listening(on, Object.fromEntries([3000, 3001, 4200, 5000, 5173, 8000, 8080, 8081, 19006].map(port => [port, 200])))

  expect((await $.command.run(run)).text).toMatch(/\n9 of 9 ports answer$/)
})

test('speaks Spanish, and Portuguese when nothing answers', async ($, on) => {
  let open: Record<number, number> = { 8000: 200 }
  on('http.fetch', (_: unknown, e: { url: string }) => {
    const code = open[Number(new URL(e.url).port)]

    return code === undefined ? { deny: 'ECONNREFUSED' } : { value: { status: code, ok: true, headers: {}, text: '' } }
  })
  let lang = 'es'
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: lang, version: 1 } }))

  expect((await $.command.run(run)).text).toBe('● 8000  200\n1 de 9 puertos responden')
  open = {}
  expect((await $.command.run(run)).text).toBe('Ningún puerto de desarrollo responde en localhost.')
  lang = 'pt'
  expect((await $.command.run(run)).text).toBe('Nenhuma porta de desenvolvimento responde no localhost.')
})
