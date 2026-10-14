import { expect, test } from 'claude-code/testing'

const run = (args: string) => ({
  command: 'json',
  args,
  origin: { kind: 'composer' } as const,
  presentation: { isFullscreen: true, columns: 120 },
})

test('pretty-prints valid JSON and copies it', async ($, on) => {
  const copied: string[] = []
  on('ui.copy', (_, e) => {
    copied.push(e.text)

    return { value: { isCopied: true } }
  })

  const answer = await $.command.run(run('{"a":[1,2],"b":null}'))
  expect(answer.text).toContain('Valid JSON')
  expect(answer.text).toContain('  "a": [')
  expect(copied[0]).toBe('{\n  "a": [\n    1,\n    2\n  ],\n  "b": null\n}')
})

test('says where the syntax error is', async ($, on) => {
  on('ui.copy', () => ({ value: { isCopied: true } }))

  const answer = await $.command.run(run('{\n  "a": 1,\n  "b": }\n'))
  expect(answer.text).toContain('line 3, column 8')
  expect(answer.text).toContain('"}"')

  const early = await $.command.run(run('[1, 2'))
  expect(early.text).toContain('line 1, column 6')
  expect(early.text).toContain('end of input')

  const trailing = await $.command.run(run('{"a":1} x'))
  expect(trailing.text).toContain('line 1, column 9')
})

test('prints the usage with no text and no selection', async ($, on) => {
  on('ui.selection', () => ({ value: undefined }))

  const answer = await $.command.run(run(''))
  expect(answer.text).toContain('Usage: /json')
})

test('uses the mouse selection when there is no text', async ($, on) => {
  on('ui.copy', () => ({ value: { isCopied: true } }))
  on('ui.selection', () => ({ value: { text: '[true]' } }))

  const answer = await $.command.run(run(''))
  expect(answer.text).toContain('Valid JSON')
})

test('speaks the language set in the hub', async ($, on) => {
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  const answer = await $.command.run(run('{'))
  expect(answer.text).toContain('JSON inválido na linha 1, coluna 2')
})
