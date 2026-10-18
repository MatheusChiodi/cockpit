import { expect, test } from 'claude-code/testing'

const run = (args: string) => ({
  command: 'uuid',
  args,
  origin: { kind: 'composer' } as const,
  presentation: { isFullscreen: true, columns: 120 },
})

const V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

test('gives one UUID by default and copies it', async ($, on) => {
  const copied: string[] = []
  on('ui.copy', (_, e) => {
    copied.push(e.text)

    return { value: { isCopied: true } }
  })

  const answer = await $.command.run(run(''))
  expect(copied[0]).toMatch(V4)
  expect(answer.text).toContain(copied[0])
  expect(answer.text).toContain('1 UUID(s) copied')
})

test('gives n distinct UUIDs, at most 20', async ($, on) => {
  const copied: string[] = []
  on('ui.copy', (_, e) => {
    copied.push(e.text)

    return { value: { isCopied: true } }
  })

  await $.command.run(run('5'))
  const lines = (copied[0] ?? '').split('\n')
  expect(lines).toHaveLength(5)
  expect(new Set(lines).size).toBe(5)

  for (const bad of ['0', '21', 'abc', '-3', '2.5']) {
    const answer = await $.command.run(run(bad))
    expect(answer.text, bad).toContain('Usage: /uuid')
  }
})

test('speaks the language set in the hub', async ($, on) => {
  on('ui.copy', () => ({ value: { isCopied: true } }))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  const answer = await $.command.run(run('2'))
  expect(answer.text).toContain('2 UUID copiado(s) al portapapeles')
})

test('speaks Portuguese, for the usage too', async ($, on) => {
  on('ui.copy', () => ({ value: { isCopied: true } }))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  expect((await $.command.run(run('3'))).text).toContain('3 UUID(s) copiado(s) para a área de transferência.')
  expect((await $.command.run(run('99'))).text).toBe('Uso: /uuid [n]  (n de 1 a 20)')
})

test('gives exactly 20 at the limit, every one a v4 UUID', async ($, on) => {
  const copied: string[] = []
  on('ui.copy', (_, e) => {
    copied.push(e.text)

    return { value: { isCopied: true } }
  })

  const answer = await $.command.run(run(' 20 '))
  const lines = (copied[0] ?? '').split('\n')
  expect(lines).toHaveLength(20)
  expect(lines.every(line => V4.test(line))).toBe(true)
  expect(answer.text?.split('\n')).toHaveLength(21)
})

test('copies nothing for a bad count', async ($, on) => {
  let copies = 0
  on('ui.copy', () => {
    copies += 1

    return { value: { isCopied: true } }
  })

  for (const bad of ['1e1', '05x', '3 4']) {
    expect((await $.command.run(run(bad))).text, bad).toBe('Usage: /uuid [n]  (n from 1 to 20)')
  }

  expect(copies).toBe(0)
})

test('still shows the UUIDs but does not claim a copy the clipboard refused', async ($, on) => {
  on('ui.copy', () => ({ value: { isCopied: false, reason: 'no-clipboard' as const } }))

  const lines = (await $.command.run(run('2'))).text?.split('\n') ?? []
  expect(lines).toHaveLength(3)
  expect(lines[0]).toMatch(V4)
  expect(lines[2]).toBe('The clipboard is not reachable on this surface.')
})

test('says the clipboard was not reachable in Portuguese', async ($, on) => {
  on('ui.copy', () => ({ value: { isCopied: false, reason: 'no-clipboard' as const } }))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  expect((await $.command.run(run(''))).text?.split('\n')[1]).toBe('Não foi possível acessar a área de transferência nesta superfície.')
})
