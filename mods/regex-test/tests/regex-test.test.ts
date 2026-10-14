import { expect, test } from 'claude-code/testing'

const run = (args: string) => ({
  command: 're',
  args,
  origin: { kind: 'composer' } as const,
  presentation: { isFullscreen: true, columns: 120 },
})

test('lists each match with its position and capture groups', async ($, on) => {
  const answer = await $.command.run(run('/(\\d+)-(?<word>\\w+)/ order 12-ab 7-cd'))
  const lines = (answer.text ?? '').split('\n')

  expect(lines[0]).toBe('/(\\d+)-(?<word>\\w+)/  2 match(es)')
  expect(lines[1]).toBe('#1  @6  "12-ab"')
  expect(lines[2]).toBe('      $1  "12"')
  expect(lines[3]).toBe('      $2  "ab"')
  expect(lines[4]).toBe('      $<word>  "ab"')
  expect(lines[5]).toBe('#2  @12  "7-cd"')
})

test('reports no match, flags and a slash inside a class', async ($, on) => {
  expect((await $.command.run(run('/z/ abc'))).text).toBe('/z/  no match')
  expect((await $.command.run(run('/B/i abc'))).text).toContain('1 match(es)')
  expect((await $.command.run(run('/[/]+/ a//b'))).text).toContain('#1  @1  "//"')
})

test('gives the engine message for an invalid pattern', async ($, on) => {
  expect((await $.command.run(run('/(/ abc'))).text).toContain('Invalid pattern:')
  expect((await $.command.run(run('/a/zz abc'))).text).toContain('Invalid pattern:')
})

test('prints the usage when the form is wrong', async ($, on) => {
  on('ui.selection', () => ({ value: undefined }))

  expect((await $.command.run(run('abc'))).text).toContain('Usage: /re')
  expect((await $.command.run(run('/abc'))).text).toContain('Usage: /re')
  expect((await $.command.run(run('/abc/'))).text).toContain('Usage: /re')
})

test('uses the mouse selection when there is no text', async ($, on) => {
  on('ui.selection', () => ({ value: { text: 'x1y22' } }))

  expect((await $.command.run(run('/\\d+/'))).text).toContain('2 match(es)')
})

test('speaks the language set in the hub', async ($, on) => {
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  expect((await $.command.run(run('/z/ abc'))).text).toContain('sem correspondência')
})
