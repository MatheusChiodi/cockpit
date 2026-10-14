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
