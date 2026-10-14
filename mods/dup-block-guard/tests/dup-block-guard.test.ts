import { expect, test } from 'claude-code/testing'

const ANSWER = { result: undefined as never }

const BLOCK = [
  'const rows = items.filter(item => item.active)',
  'const names = rows.map(row => row.name.trim())',
  'const sorted = names.sort((a, b) => a.localeCompare(b))',
  'const unique = [...new Set(sorted)]',
  'const label = unique.join(", ")',
  'render(label, unique.length)',
].join('\n')

const FILE = `export const first = () => {\n${BLOCK}\n}\n\nexport const second = () => {\n  return 1\n}\n`

const edit = (new_string: string, old_string = 'return 1') => ({
  tool: 'Edit' as const,
  file_path: 'src/report.ts',
  old_string,
  new_string,
  tool_use_id: `e-${new_string.length}-${old_string.length}`,
})

const project = (on: any, file: string) => {
  on('tool.call', { tool: 'Edit' }, () => ANSWER)
  on('fs.read', () => ({ value: file }))
}

test('refuses new code that repeats a block already in the file', async ($, on) => {
  project(on, FILE)

  const answer = await $.tool.call(edit(`${BLOCK}\n  return 2`))
  expect(answer.deny).toContain('dup-block-guard blocked the edit: it repeats 6 lines already in this file')
  expect(answer.deny).toContain('const rows = items.filter')
})

test('lets different code, short blocks, non-code files and moved blocks through', async ($, on) => {
  project(on, FILE)

  const different = BLOCK.replaceAll('items', 'orders').replaceAll('row', 'order')
  expect((await $.tool.call(edit(different))).deny).toBeUndefined()

  const short = BLOCK.split('\n').slice(0, 5).join('\n')
  expect((await $.tool.call(edit(short))).deny).toBeUndefined()

  const doc = await $.tool.call({ ...edit(BLOCK), file_path: 'notes.md', tool_use_id: 'md' })
  expect(doc.deny).toBeUndefined()

  // The block was already in the text being replaced: the edit only moves it.
  const moved = await $.tool.call(edit(`// moved\n${BLOCK}`, BLOCK))
  expect(moved.deny).toBeUndefined()
})

test('lets the edit through when the file cannot be read', async ($, on) => {
  on('tool.call', { tool: 'Edit' }, () => ANSWER)
  on('fs.read', () => {
    throw new Error('missing')
  })

  expect((await $.tool.call(edit(BLOCK))).deny).toBeUndefined()
})

test('speaks the language set in the hub', async ($, on) => {
  project(on, FILE)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  const answer = await $.tool.call(edit(`${BLOCK}\n  return 2`))
  expect(answer.deny).toContain('dup-block-guard bloqueou a edição: ela repete 6 linhas')
})
