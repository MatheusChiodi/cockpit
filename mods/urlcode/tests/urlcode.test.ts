import { expect, test } from 'claude-code/testing'

const run = (args: string) => ({
  command: 'url',
  args,
  origin: { kind: 'composer' } as const,
  presentation: { isFullscreen: true, columns: 120 },
})

test('encodes text and copies it', async ($, on) => {
  const copied: string[] = []
  on('ui.copy', (_, e) => {
    copied.push(e.text)

    return { value: { isCopied: true } }
  })

  const answer = await $.command.run(run('encode a b&c=ç'))
  expect(copied[0]).toBe('a%20b%26c%3D%C3%A7')
  expect(answer.text).toContain('Copied to the clipboard.')
})

test('decodes when the mode is given or when the text has %XX', async ($, on) => {
  on('ui.copy', () => ({ value: { isCopied: true } }))

  expect((await $.command.run(run('decode a%20b%C3%A7'))).text).toContain('a bç')
  expect((await $.command.run(run('x%2Fy'))).text).toContain('x/y')
  expect((await $.command.run(run('plain text'))).text).toContain('plain%20text')
})

test('says where the percent sequence is broken', async ($, on) => {
  on('ui.copy', () => ({ value: { isCopied: true } }))

  expect((await $.command.run(run('decode ab%zz'))).text).toContain('position 3')
  expect((await $.command.run(run('decode %E4'))).text).toContain('not valid UTF-8')
})

test('uses the mouse selection when there is no text', async ($, on) => {
  on('ui.copy', () => ({ value: { isCopied: true } }))
  on('ui.selection', () => ({ value: { text: 'a b' } }))

  expect((await $.command.run(run(''))).text).toContain('a%20b')
  expect((await $.command.run(run('decode'))).text).toContain('Decoded')
})

test('prints the usage with no text and no selection', async ($, on) => {
  on('ui.selection', () => ({ value: undefined }))

  expect((await $.command.run(run(''))).text).toContain('Usage: /url')
})

test('speaks the language set in the hub', async ($, on) => {
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  expect((await $.command.run(run('decode %zz'))).text).toContain('Não deu para decodificar')
})

const copies = (on: any) => {
  const copied: string[] = []
  on('ui.copy', (_: unknown, e: { text: string }) => {
    copied.push(e.text)

    return { value: { isCopied: true } }
  })

  return copied
}

test('takes enc and dec, in any case', async ($, on) => {
  const copied = copies(on)

  await $.command.run(run('ENC a/b'))
  await $.command.run(run('Dec a%2Fb'))
  expect(copied).toEqual(['a%2Fb', 'a/b'])
})

test('an explicit encode wins over text that looks encoded', async ($, on) => {
  const copied = copies(on)

  const answer = await $.command.run(run('encode a%20b'))
  expect(copied[0]).toBe('a%2520b')
  expect(answer.text).toBe('a%2520b\nEncoded. Copied to the clipboard.')
})

test('copies nothing when the text cannot be decoded, and says where', async ($, on) => {
  const copied = copies(on)

  expect((await $.command.run(run('decode ok%E4'))).text).toBe('Cannot decode: the bytes near position 3 are not valid UTF-8.')
  expect((await $.command.run(run('decode 100%'))).text).toBe('Cannot decode: "%" at position 4 is not followed by two hex digits.')
  expect(copied).toEqual([])
})

test('prints the usage when reading the selection fails', async ($, on) => {
  on('ui.selection', () => ({ deny: 'no selection support' }))

  expect((await $.command.run(run('encode'))).text).toContain('Usage: /url')
})

test('speaks Spanish when the hub is set to es', async ($, on) => {
  copies(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  expect((await $.command.run(run('a b'))).text).toBe('a%20b\nCodificado. Copiado al portapapeles.')
  expect((await $.command.run(run('decode %zz'))).text).toContain('No se pudo decodificar: el "%" en la posición 1')
})

test('speaks Portuguese on a successful decode', async ($, on) => {
  copies(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  expect((await $.command.run(run('a%20b'))).text).toBe('a b\nDecodificado. Copiado para a área de transferência.')
})
