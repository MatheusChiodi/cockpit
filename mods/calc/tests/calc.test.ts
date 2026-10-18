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

test('uses the mouse selection when no expression is typed', async ($, on) => {
  const copied: string[] = []
  on('ui.selection', () => ({ value: { text: '  6 * 7  ' } as never }))
  on('ui.copy', (_, e) => {
    copied.push(e.text)

    return { value: { isCopied: true } }
  })

  const answer = await $.command.run(run('   '))
  expect(answer.text).toContain('6 * 7 = 42')
  expect(copied).toEqual(['42'])
})

test('prints the usage when reading the selection fails', async ($, on) => {
  on('ui.selection', () => {
    throw new Error('no selection support')
  })

  expect((await $.command.run(run(''))).text).toContain('Usage: /calc')
})

test('copies nothing when the expression is wrong', async ($, on) => {
  const copied: string[] = []
  on('ui.copy', (_, e) => {
    copied.push(e.text)

    return { value: { isCopied: true } }
  })

  await $.command.run(run('2 +'))
  await $.command.run(run('1e5'))
  expect(copied).toEqual([])
})

test('rounds floating point noise to twelve significant digits', async ($, on) => {
  on('ui.copy', () => ({ value: { isCopied: true } }))

  expect((await $.command.run(run('1 / 3'))).text).toContain(' = 0.333333333333\n')
  expect((await $.command.run(run('0.1 * 3'))).text).toContain(' = 0.3\n')
})

test('speaks Spanish when the hub is set to es', async ($, on) => {
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))
  on('ui.selection', () => ({ value: undefined }))

  expect((await $.command.run(run('(1'))).text).toContain('El "(" de la posición 1 nunca se cierra')
  expect((await $.command.run(run(''))).text).toContain('Uso: /calc <expresión>')
})

test('registers the command with a localized description at session start', async ($, on) => {
  const registered: { name: string; description?: string }[] = []
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))
  on('command.register', (_$, e) => {
    registered.push(e)

    return { value: { command: e.name } }
  })

  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })
  expect(registered[0]?.name).toBe('calc')
  expect(registered[0]?.description).toContain('Calcula uma expressão')
})
