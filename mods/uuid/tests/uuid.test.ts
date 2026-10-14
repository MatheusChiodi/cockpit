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
