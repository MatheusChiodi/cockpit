import { expect, test } from 'claude-code/testing'

const run = (args: string) => ({
  command: 'calc',
  args,
  origin: { kind: 'composer' } as const,
  presentation: { isFullscreen: true, columns: 120 },
})

const CASES: [string, string][] = [
  ['2+3*4', '14'],
  ['(2 + 3) * 4', '20'],
  ['2^3^2', '512'],
  ['-2^2', '-4'],
  ['2^-1', '0.5'],
  ['--3', '3'],
  ['10 % 3', '1'],
  ['0.1 + 0.2', '0.3'],
  ['7 / 2', '3.5'],
  ['.5 * 4', '2'],
  ['100 - 1 - 1', '98'],
  ['((1 + 2) * (3 + 4))', '21'],
]

test('evaluates with precedence, associativity and decimals, and copies the result', async ($, on) => {
  const copied: string[] = []
  on('ui.copy', (_, e) => {
    copied.push(e.text)

    return { value: { isCopied: true } }
  })

  for (const [expression, result] of CASES) {
    const answer = await $.command.run(run(expression))
    expect(answer.text, expression).toContain(` = ${result}\n`)
    expect(copied.at(-1), expression).toBe(result)
  }
})

test('says what is wrong with a bad expression', async ($, on) => {
  on('ui.copy', () => ({ value: { isCopied: true } }))

  const BAD: [string, string][] = [
    ['2 +', 'ends too soon'],
    ['(1 + 2', 'The "(" at position 1 is never closed'],
    ['1 / 0', 'Division by zero'],
    ['5 % 0', 'Division by zero'],
    ['2 $ 3', 'Unexpected character "$" at position 3'],
    ['1 + 2)', 'Unexpected ")" at position 6'],
    ['1 2', 'Unexpected "2" at position 3'],
    ['* 3', 'Unexpected "*" at position 1'],
    ['(-8) ^ 0.5', 'not a finite number'],
  ]

  for (const [expression, message] of BAD) {
    const answer = await $.command.run(run(expression))
    expect(answer.text, expression).toContain(message)
  }
})

test('prints the usage with no expression and no selection', async ($, on) => {
  on('ui.selection', () => ({ value: undefined }))

  expect((await $.command.run(run(''))).text).toContain('Usage: /calc')
})

test('speaks the language set in the hub', async ($, on) => {
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  expect((await $.command.run(run('1 / 0'))).text).toContain('Divisão por zero')
})
