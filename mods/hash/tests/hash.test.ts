import { expect, test } from 'claude-code/testing'

const UTF8 = '0664077f33cc3ebbaa4bbdacac0eb70e740983080f01dce29929e73b7785a7ad'

const run = (args: string) => ({
  command: 'hash',
  args,
  origin: { kind: 'composer' } as const,
  presentation: { isFullscreen: true, columns: 120 },
})

test('hashes a text with SHA-256 and SHA-1 and copies the SHA-256', async ($, on) => {
  const copied: string[] = []
  on('ui.copy', (_, e) => {
    copied.push(e.text)

    return { value: { isCopied: true } }
  })

  const answer = await $.command.run(run('abc'))
  expect(answer.text).toContain('sha-256  ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
  expect(answer.text).toContain('sha-1    a9993e364706816aba3e25717850c26c9cd0d89d')
  expect(copied[0]).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
})

test('hashes UTF-8 text as bytes', async ($, on) => {
  on('ui.copy', () => ({ value: { isCopied: true } }))

  const answer = await $.command.run(run('ação'))
  expect(answer.text).toMatch(/sha-256  [0-9a-f]{64}/)
})

test('prints the usage with no text and no selection', async ($, on) => {
  on('ui.selection', () => ({ value: undefined }))

  expect((await $.command.run(run('  '))).text).toContain('Usage: /hash')
})

test('speaks the language set in the hub', async ($, on) => {
  on('ui.copy', () => ({ value: { isCopied: true } }))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  expect((await $.command.run(run('abc'))).text).toContain('SHA-256 copiado')
})

test('hashes the mouse selection exactly, whitespace included', async ($, on) => {
  const copied: string[] = []
  on('ui.copy', (_, e) => {
    copied.push(e.text)

    return { value: { isCopied: true } }
  })
  on('ui.selection', () => ({ value: { text: 'hello' } }))

  const answer = await $.command.run(run(''))
  expect(answer.text).toBe(
    'sha-256  2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824\nsha-1    aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d\nSHA-256 copied to the clipboard.',
  )
  expect(copied).toEqual(['2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824'])
})

test('hashes UTF-8 bytes to the known digest', async ($, on) => {
  on('ui.copy', () => ({ value: { isCopied: true } }))

  expect((await $.command.run(run('ação'))).text).toContain(`sha-256  ${UTF8}`)
})

test('a selection of only spaces or a failing selection prints the usage', async ($, on) => {
  let throws = false
  on('ui.selection', () => {
    if (throws) {
      throw new Error('unsupported')
    }

    return { value: { text: '   ' } }
  })

  expect((await $.command.run(run(''))).text).toContain('Usage: /hash')
  throws = true
  expect((await $.command.run(run(''))).text).toContain('Usage: /hash')
})

test('registers /hash and speaks Spanish', async ($, on) => {
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  const hints: string[] = []
  on('command.register', (_$, e) => {
    hints.push(`${e.name} ${e.argumentHint}`)

    return { value: { command: e.name } }
  })
  on('ui.copy', () => ({ value: { isCopied: true } }))
  on('ui.selection', () => ({ value: undefined }))

  await $.session.start({ cwd: '/p', surface: 'terminal', isInteractive: true })
  expect(hints).toEqual(['hash <texto>'])
  expect((await $.command.run(run('abc'))).text).toContain('SHA-256 copiado al portapapeles.')
  expect((await $.command.run(run(''))).text).toBe('Uso: /hash <texto>')
})
