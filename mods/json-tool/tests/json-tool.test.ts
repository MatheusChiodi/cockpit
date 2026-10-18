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

test('speaks Spanish when the hub is set to es', async ($, on) => {
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))
  on('ui.copy', () => ({ value: { isCopied: true } }))

  const valid = await $.command.run(run('[1]'))
  expect(valid.text).toContain('JSON válido')
  expect(valid.text).toContain('portapapeles')

  const broken = await $.command.run(run('[1,'))
  expect(broken.text).toContain('fin de la entrada')
})

test('reports the copied text in Portuguese', async ($, on) => {
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))
  on('ui.copy', () => ({ value: { isCopied: true } }))

  const answer = await $.command.run(run('{"a":1}'))
  expect(answer.text).toContain('JSON válido, 3 linha(s) formatado.')
  expect(answer.text).toContain('área de transferência')
})

test('falls back to the usage when reading the selection throws', async ($, on) => {
  on('ui.selection', () => {
    throw new Error('no selection support')
  })

  const answer = await $.command.run(run('   '))
  expect(answer.text).toContain('Usage: /json')
})

test('rejects bad escapes, control characters and misspelled literals', async ($, on) => {
  on('ui.copy', () => ({ value: { isCopied: true } }))

  const escape = await $.command.run(run('"a\\x"'))
  expect(escape.text).toContain('line 1, column 3')

  const control = await $.command.run(run('"a\tb"'))
  expect(control.text).toContain('Invalid JSON at line 1, column 3')

  const literal = await $.command.run(run('[tru]'))
  expect(literal.text).toContain('line 1, column 2')

  const key = await $.command.run(run('{a:1}'))
  expect(key.text).toContain('character "a"')
})

test('accepts unicode escapes, nested values and exponents without copying on error', async ($, on) => {
  const copied: string[] = []
  on('ui.copy', (_, e) => {
    copied.push(e.text)

    return { value: { isCopied: true } }
  })

  const answer = await $.command.run(run('{"u":"\\u00e9","n":-1.5e3,"x":[{},[]]}'))
  expect(answer.text).toContain('Valid JSON')
  expect(copied).toHaveLength(1)

  await $.command.run(run('{"a":}'))
  expect(copied).toHaveLength(1)
})

test('registers the /json command with a hint', async ($, on) => {
  const registered: { name: string; hint?: string }[] = []
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('command.register', (_, e) => {
    registered.push({ name: e.name, hint: e.argumentHint })

    return { value: { command: e.name } }
  })

  await $.session.start({ cwd: '/repo', surface: null, isInteractive: true })
  expect(registered).toEqual([{ name: 'json', hint: '[text]' }])
})
