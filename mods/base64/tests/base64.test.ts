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

test('uses the mouse selection when no text is given', async ($, on) => {
  const copied: string[] = []
  on('ui.copy', (_, e) => {
    copied.push(e.text)

    return { value: { isCopied: true } }
  })
  on('ui.selection', () => ({ value: { text: 'selected' } }) as never)

  const answer = await $.command.run(run('encode'))
  expect(answer.text).toBe('c2VsZWN0ZWQ=\nCopied to the clipboard.')
  expect(copied).toEqual(['c2VsZWN0ZWQ='])
})

test('says the usage when the selection holds only whitespace', async ($, on) => {
  on('ui.copy', () => ({ value: { isCopied: true } }))
  on('ui.selection', () => ({ value: { text: '  \n ' } }) as never)

  expect((await $.command.run(run('dec   '))).text).toBe('Usage: /b64 enc <text>  or  /b64 dec <text>')
})

test('accepts the long mode names in any case, and ignores whitespace inside Base64', async ($, on) => {
  on('ui.copy', () => ({ value: { isCopied: true } }))

  expect((await $.command.run(run('ENCODE hi'))).text).toBe('aGk=\nCopied to the clipboard.')
  expect((await $.command.run(run('Decode aGVs\nbG8='))).text).toBe('hello\nCopied to the clipboard.')
})

test('refuses Base64 of an impossible length and copies nothing', async ($, on) => {
  const copied: string[] = []
  on('ui.copy', (_, e) => {
    copied.push(e.text)

    return { value: { isCopied: true } }
  })

  expect((await $.command.run(run('dec abcde'))).text).toBe('Not valid Base64.')
  expect(copied).toEqual([])
})

test('registers /b64 at session start', async ($, on) => {
  const names: string[] = []
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('command.register', (_$, e) => {
    names.push(e.name)

    return { value: { command: e.name } }
  })

  await $.session.start({ cwd: '/project', surface: 'terminal', isInteractive: true })
  expect(names).toEqual(['b64'])
})

test('speaks Spanish when the hub language is es', async ($, on) => {
  on('ui.copy', () => ({ value: { isCopied: true } }))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  expect((await $.command.run(run('enc ok'))).text).toBe('b2s=\nCopiado al portapapeles.')
  expect((await $.command.run(run('dec /w=='))).text).toBe('Los bytes no son un texto UTF-8 válido.')
  expect((await $.command.run(run('x'))).text).toBe('Uso: /b64 enc <texto>  o  /b64 dec <texto>')
})
