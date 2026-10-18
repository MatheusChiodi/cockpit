import { expect, test } from 'claude-code/testing'

const ANSWER = { result: undefined as never }

const write = (content: string, id: string) =>
  ({ tool: 'Write', file_path: 'data/seed.json', content, tool_use_id: id }) as const

test('refuses a Write over 1,500 lines', async ($, on) => {
  on('tool.call', { tool: 'Write' }, () => ANSWER)

  const answer = await $.tool.call(write('row\n'.repeat(1501), 'l-1'))
  expect(answer.deny).toContain('large-write-guard blocked the write')
  expect(answer.deny).toContain('1,501 lines')
})

test('refuses a Write over 200 KB', async ($, on) => {
  on('tool.call', { tool: 'Write' }, () => ANSWER)

  const answer = await $.tool.call(write('x'.repeat(201 * 1024), 'k-1'))
  expect(answer.deny).toContain('201 KB')

  // 70,000 three-byte characters are 205 KB even though they are under 200,000 characters.
  const wide = await $.tool.call(write('€'.repeat(70000), 'k-2'))
  expect(wide.deny).toContain('large-write-guard')
})

test('lets small files and exactly the limits through', async ($, on) => {
  on('tool.call', { tool: 'Write' }, () => ANSWER)

  expect((await $.tool.call(write('hello\n', 's-1'))).deny).toBeUndefined()
  expect((await $.tool.call(write('row\n'.repeat(1500), 's-2'))).deny).toBeUndefined()
  expect((await $.tool.call(write('x'.repeat(200 * 1024), 's-3'))).deny).toBeUndefined()
})

test('speaks the language set in the hub', async ($, on) => {
  on('tool.call', { tool: 'Write' }, () => ANSWER)
  // Stands in for the hub: answers the language it would hold.
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  const answer = await $.tool.call(write('row\n'.repeat(2000), 'pt-1'))
  expect(answer.deny).toContain('large-write-guard bloqueou a gravação')
  expect(answer.deny).toContain('2.000 linhas')
})

test('counts four bytes for an emoji and two for an accented letter', async ($, on) => {
  on('tool.call', { tool: 'Write' }, () => ANSWER)

  expect((await $.tool.call(write('😀'.repeat(51200), 'e-1'))).deny).toBeUndefined()
  expect((await $.tool.call(write('😀'.repeat(51201), 'e-2'))).deny).toContain('201 KB')
  expect((await $.tool.call(write('é'.repeat(102400), 'e-3'))).deny).toBeUndefined()
  expect((await $.tool.call(write('é'.repeat(102401), 'e-4'))).deny).toContain('201 KB')
})

test('counts a last line without a newline', async ($, on) => {
  on('tool.call', { tool: 'Write' }, () => ANSWER)

  expect((await $.tool.call(write(`${'row\n'.repeat(1500)}tail`, 't-1'))).deny).toContain('1,501 lines')
})

test('a refused write never reaches the tool, and the path is named', async ($, on) => {
  let ran = 0
  on('tool.call', { tool: 'Write' }, () => {
    ran += 1

    return ANSWER
  })

  const answer = await $.tool.call({ tool: 'Write', file_path: 'src/huge.ts', content: 'a\n'.repeat(3000), tool_use_id: 'r-1' })
  expect(answer.deny).toBe(
    'large-write-guard blocked the write: src/huge.ts would be 3,000 lines. Split it into smaller files or generate it with a script.',
  )
  expect(ran).toBe(0)
})

test('leaves Edit calls alone', async ($, on) => {
  on('tool.call', { tool: 'Edit' }, () => ANSWER)

  const answer = await $.tool.call({
    tool: 'Edit',
    file_path: 'data/seed.json',
    old_string: 'a',
    new_string: 'row\n'.repeat(5000),
    tool_use_id: 'ed-1',
  })
  expect(answer.deny).toBeUndefined()
})

test('speaks Spanish and formats numbers for the language', async ($, on) => {
  on('tool.call', { tool: 'Write' }, () => ANSWER)
  let lang = 'es'
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: lang, version: 1 } }))

  const lines = await $.tool.call(write('row\n'.repeat(12000), 'es-1'))
  expect(lines.deny).toBe(
    'large-write-guard bloqueó la escritura: data/seed.json tendría 12.000 líneas. Divídelo en archivos más pequeños o genéralo con un script.',
  )
  expect((await $.tool.call(write('x'.repeat(300 * 1024), 'es-2'))).deny).toContain('tendría 300 KB')

  lang = 'pt'
  expect((await $.tool.call(write('x'.repeat(300 * 1024), 'pt-2'))).deny).toContain('teria 300 KB')
})
