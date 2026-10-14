import { expect, test } from 'claude-code/testing'

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
