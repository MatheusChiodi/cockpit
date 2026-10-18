import { expect, mock, test } from 'claude-code/testing'

const run = (args: string) => ({
  command: 'jwt',
  args,
  origin: { kind: 'composer' } as const,
  presentation: { isFullscreen: true, columns: 120 },
})

const TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0MiIsIm5hbWUiOiJBbmEiLCJleHAiOjE3NjA0MDAwMDAsImlhdCI6MTc2MDMwMDAwMH0.sig'

test('decodes header and payload with readable dates', async ($, on) => {
  mock.clock(on, { now: Date.UTC(2026, 0, 1) })

  const answer = await $.command.run(run(TOKEN))
  expect(answer.text).toContain('{"alg":"HS256","typ":"JWT"}')
  expect(answer.text).toContain('"name":"Ana"')
  expect(answer.text).toContain('2025-10-14 00:00:00 UTC (expired)')
  expect(answer.text).toContain('iat')
  expect(answer.text).toContain('signature was not verified')
})

test('marks a token that has not expired', async ($, on) => {
  mock.clock(on, { now: Date.UTC(2025, 0, 1) })

  const answer = await $.command.run(run(TOKEN))
  expect(answer.text).toContain('(still valid)')
})

test('says what is wrong with a bad token', async ($, on) => {
  mock.clock(on, { now: 0 })

  expect((await $.command.run(run('abc.def'))).text).toContain('found 2')
  expect((await $.command.run(run('a!b.c.d'))).text).toContain('header is not valid: it is not base64url')
  expect((await $.command.run(run('aGk.aGk.x'))).text).toContain('it is not JSON')
})

test('prints the usage with no text and no selection', async ($, on) => {
  on('ui.selection', () => ({ value: undefined }))

  expect((await $.command.run(run(''))).text).toContain('Usage: /jwt')
})

test('speaks the language set in the hub', async ($, on) => {
  mock.clock(on, { now: 0 })
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  expect((await $.command.run(run('abc.def'))).text).toContain('Não é um JWT')
})

// A token built at run time from its header and payload.
const b64 = (value: unknown) => btoa(JSON.stringify(value)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')
const token = (payload: unknown) => `${b64({ alg: 'none' })}.${b64(payload)}.x`

test('decodes the mouse selection when no token is typed', async ($, on) => {
  mock.clock(on, { now: 0 })
  on('ui.selection', () => ({ value: { text: `  ${token({ sub: 'sel' })}  ` } as never }))

  expect((await $.command.run(run(''))).text).toContain('"sub":"sel"')
})

test('prints the usage when reading the selection fails', async ($, on) => {
  on('ui.selection', () => {
    throw new Error('no selection support')
  })

  expect((await $.command.run(run('   '))).text).toBe('Usage: /jwt <token>  (or select the token and run /jwt)')
})

test('marks a token whose nbf is still ahead, and skips claims that are not numbers', async ($, on) => {
  mock.clock(on, { now: Date.UTC(2025, 0, 1) })

  const answer = await $.command.run(run(token({ nbf: Date.UTC(2026, 0, 1) / 1000, exp: 'soon' })))
  expect(answer.text).toContain('nbf     2026-01-01 00:00:00 UTC (not valid yet)')
  expect(answer.text).not.toContain('exp ')
})

test('ignores whitespace and line breaks inside a pasted token', async ($, on) => {
  mock.clock(on, { now: 0 })
  const whole = token({ sub: 'wrapped' })
  const broken = `${whole.slice(0, 10)}\n  ${whole.slice(10)}`

  expect((await $.command.run(run(broken))).text).toContain('"sub":"wrapped"')
})

test('names the payload when only the payload is broken', async ($, on) => {
  mock.clock(on, { now: 0 })

  expect((await $.command.run(run(`${b64({ alg: 'none' })}.a$b.x`))).text).toBe('The payload is not valid: it is not base64url.')
  expect((await $.command.run(run(`${b64({ alg: 'none' })}.aGk.x`))).text).toBe('The payload is not valid: it is not JSON.')
})

test('speaks Portuguese and Spanish for dates, errors and the note', async ($, on) => {
  mock.clock(on, { now: Date.UTC(2026, 0, 1) })
  let lang = 'pt'
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: lang, version: 1 } }))
  on('ui.selection', () => ({ value: undefined }))

  const pt = await $.command.run(run(TOKEN))
  expect(pt.text).toContain('(expirado)')
  expect(pt.text).toContain('Apenas decodificado: a assinatura não foi verificada.')
  expect((await $.command.run(run('a!b.c.d'))).text).toBe('O header não é válido: não é base64url.')
  expect((await $.command.run(run(''))).text).toContain('Uso: /jwt <token>')

  lang = 'es'
  const es = await $.command.run(run(TOKEN))
  expect(es.text).toContain('(expirado)')
  expect(es.text).toContain('Solo decodificado: la firma no se verificó.')
  expect((await $.command.run(run('abc'))).text).toBe('No es un JWT: se esperaban 3 partes separadas por punto, encontré 1.')
  expect((await $.command.run(run('aGk.aGk.x'))).text).toBe('El header no es válido: no es JSON.')
})
