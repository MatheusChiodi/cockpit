import { expect, test } from 'claude-code/testing'

const run = (args: string) => ({
  command: 'http',
  args,
  origin: { kind: 'composer' } as const,
  presentation: { isFullscreen: true, columns: 120 },
})

const answer = (status: number, text: string, type = 'text/plain') => ({
  value: { status, ok: status < 300, headers: { 'content-type': type }, text },
})

test('shows status, type, size and the first 12 lines of the body', async ($, on) => {
  const asked: string[] = []
  on('http.fetch', (_, e) => {
    asked.push(e.url)

    return answer(200, Array.from({ length: 30 }, (_, index) => `line ${index + 1}`).join('\n'))
  })

  const result = await $.command.run(run('https://example.com/data'))
  expect(asked).toEqual(['https://example.com/data'])
  expect(result.text).toMatch(/^status\s+200\ntype\s+text\/plain\nsize\s+\d+ bytes\n\nline 1\n/)
  expect(result.text).toContain('line 12')
  expect(result.text).not.toContain('line 13')
})

test('cuts long lines and reports an empty body', async ($, on) => {
  let body = ''
  on('http.fetch', () => answer(body === '' ? 204 : 200, body))
  expect((await $.command.run(run('http://localhost:3000'))).text).toContain('(empty body)')

  body = 'x'.repeat(500)
  const long = await $.command.run(run('http://localhost:3000'))
  expect(long.text).toContain(`${'x'.repeat(117)}...`)
  expect(long.text).toMatch(/size\s+500 bytes/)
})

test('refuses anything but http and https without fetching', async ($, on) => {
  on('http.fetch', () => {
    throw new Error('should not fetch')
  })
  on('ui.selection', () => ({ value: undefined }))

  for (const bad of ['', 'ftp://host/file', 'file:///etc/passwd', 'example.com', 'javascript:alert(1)']) {
    expect((await $.command.run(run(bad))).text, bad).toContain('Usage: /http')
  }
})

test('says the request failed when the fetch rejects', async ($) => {
  // Nothing answers http.fetch here, so the call rejects.
  expect((await $.command.run(run('https://nope.invalid'))).text).toContain('Request failed:')
})

test('speaks the language set in the hub', async ($, on) => {
  on('http.fetch', () => answer(404, 'nope'))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  expect((await $.command.run(run('https://example.com'))).text).toMatch(/^status\s+404\ntipo/)
})
