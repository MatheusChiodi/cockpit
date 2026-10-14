import { expect, test } from 'claude-code/testing'

const run = (args: string) => ({
  command: 'b64',
  args,
  origin: { kind: 'composer' } as const,
  presentation: { isFullscreen: true, columns: 120 },
})

test('encodes and decodes, UTF-8 safe', async ($, on) => {
  const copied: string[] = []
  on('ui.copy', (_, e) => {
    copied.push(e.text)

    return { value: { isCopied: true } }
  })

  const plain = await $.command.run(run('enc hello'))
  expect(plain.text).toContain('aGVsbG8=')

  const accents = await $.command.run(run('enc ação ✓'))
  expect(copied.at(-1)).toBe('YcOnw6NvIOKckw==')

  const back = await $.command.run(run('dec YcOnw6NvIOKckw=='))
  expect(back.text).toContain('ação ✓')
  expect(accents.text).toContain('Copied to the clipboard.')
})

test('decodes url-safe Base64 without padding', async ($, on) => {
  on('ui.copy', () => ({ value: { isCopied: true } }))

  const answer = await $.command.run(run('dec YcOnw6NvIOKckw'))
  expect(answer.text).toContain('ação ✓')
})

test('says what is wrong with bad input', async ($, on) => {
  on('ui.copy', () => ({ value: { isCopied: true } }))
  on('ui.selection', () => ({ value: undefined }))

  expect((await $.command.run(run('dec ***'))).text).toContain('Not valid Base64')
  // Valid Base64 of the single byte 0xFF, which is not UTF-8.
  expect((await $.command.run(run('dec /w=='))).text).toContain('not valid UTF-8')
  expect((await $.command.run(run('enc'))).text).toContain('Usage: /b64')
  expect((await $.command.run(run('hello'))).text).toContain('Usage: /b64')
})

test('speaks the language set in the hub', async ($, on) => {
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  expect((await $.command.run(run('dec ***'))).text).toContain('Base64 inválido')
})
