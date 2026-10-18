import { expect, test } from 'claude-code/testing'

const INPUT = { model: 'claude-test', promptModel: 'claude-test', surfaces: ['terminal'], tools: [], outputStyle: null, traits: [] } as never

// Paths are read relative to /work, whatever the separator.
const project = (on: any, files: Record<string, string>) => {
  const key = (path: string) => path.slice(path.indexOf('work') + 5).replace(/[^\w.-]+/g, '/')

  on('session.root', () => ({ value: '/work' }))
  on('fs.read', (_: unknown, e: { path: string }) => (key(e.path) in files ? { value: files[key(e.path)] } : { deny: 'ENOENT' }))
  on('prompt.compose', () => ({ sections: [{ id: 'other', text: 'kept', scope: 'session' as const }] }))
  on('tool.call', { tool: 'Edit' }, () => ({ result: undefined as never }))
}

const composed = async ($: any): Promise<{ id: string; text: string }[]> => (await $.prompt.compose(INPUT)).sections

test('tells the prettier, editorconfig and eslint rules', async ($, on) => {
  project(on, {
    '.prettierrc': JSON.stringify({ semi: false, singleQuote: true, tabWidth: 2, printWidth: 100 }),
    '.editorconfig': 'root = true\n[*]\nindent_style = space\nindent_size = 2\nend_of_line = lf\n',
    '.eslintrc.json': JSON.stringify({ rules: { 'no-console': 'error', eqeqeq: ['error', 'always'], semi: 'off', 'no-var': 2 } }),
  })

  const sections = await composed($)
  expect(sections.map(s => s.id)).toEqual(['other', 'style-context:style'])

  const text = sections[1]!.text
  expect(text).toContain('- prettier: no semicolons, single quotes, indent 2 spaces, line width 100')
  expect(text).toContain('- editorconfig: space 2 indent, lf line endings')
  expect(text).toContain('- eslint errors on: no-console, eqeqeq, no-var')
  expect(text).not.toContain('semi,')
})

test('reads a YAML prettierrc', async ($, on) => {
  project(on, { '.prettierrc.yaml': 'semi: true\nsingleQuote: false\nuseTabs: true\n' })
  expect((await composed($))[1]!.text).toContain('- prettier: semicolons, double quotes, tab indent')
})

test('falls back to the prettier key of package.json', async ($, on) => {
  project(on, { 'package.json': JSON.stringify({ prettier: { singleQuote: true } }) })
  expect((await composed($))[1]!.text).toContain('single quotes')
})

test('reads once and refreshes after a style file is edited', async ($, on) => {
  const files: Record<string, string> = { '.prettierrc': '{"semi":true}' }
  project(on, files)

  expect((await composed($))[1]!.text).toContain('semicolons')

  files['.prettierrc'] = '{"semi":false}'
  expect((await composed($))[1]!.text).not.toContain('no semicolons')

  await $.tool.call({ tool: 'Edit', file_path: '/work/.prettierrc', old_string: 'a', new_string: 'b', tool_use_id: 'e1' })
  expect((await composed($))[1]!.text).toContain('no semicolons')
})

test('adds nothing without style config or with an invalid package.json', async ($, on) => {
  project(on, { 'package.json': '{ nope' })
  expect((await composed($)).map(s => s.id)).toEqual(['other'])
})

test('says default options for an empty prettier config, and the trailing comma style', async ($, on) => {
  const files: Record<string, string> = { '.prettierrc.json': '{}' }
  project(on, files)

  expect((await composed($))[1]!.text).toContain('- prettier: default options')

  files['.prettierrc.json'] = JSON.stringify({ trailingComma: 'all', useTabs: true, tabWidth: 4 })
  await $.tool.call({ tool: 'Edit', file_path: '/work/.prettierrc.json', old_string: 'a', new_string: 'b', tool_use_id: 'e1' })
  const text = (await composed($))[1]!.text
  expect(text).toContain('- prettier: tab indent, trailing commas: all')
  expect(text).not.toContain('indent 4 spaces')
})

test('skips an editorconfig line length that is off, and keeps the rest', async ($, on) => {
  project(on, { '.editorconfig': '[*]\nindent_style = TAB\nmax_line_length = off\n' })

  const text = (await composed($))[1]!.text
  expect(text).toContain('- editorconfig: tab indent')
  expect(text).not.toContain('max line length')
})

test('reads eslint rules from package.json and caps the list at six', async ($, on) => {
  const rules = Object.fromEntries(Array.from({ length: 8 }, (_, at) => [`rule-${at}`, 'error']))
  project(on, { 'package.json': JSON.stringify({ eslintConfig: { rules: { ...rules, quiet: 'warn' } } }) })

  const text = (await composed($))[1]!.text
  expect(text).toContain('- eslint errors on: rule-0, rule-1, rule-2, rule-3, rule-4, rule-5')
  expect(text).not.toContain('rule-6')
  expect(text).not.toContain('quiet')
})

test('a YAML .eslintrc lists no rules but other config still shows', async ($, on) => {
  project(on, { '.eslintrc': 'rules:\n  eqeqeq: error\n', '.prettierrc': '{"semi":true}' })

  const text = (await composed($))[1]!.text
  expect(text).toContain('- prettier: semicolons')
  expect(text).not.toContain('eslint')
})

test('an edit of a source file keeps the cached section', async ($, on) => {
  const files: Record<string, string> = { '.prettierrc': '{"semi":true}' }
  project(on, files)

  expect((await composed($))[1]!.text).toContain('semicolons')

  files['.prettierrc'] = '{"semi":false}'
  await $.tool.call({ tool: 'Edit', file_path: '/work/src/app.ts', old_string: 'a', new_string: 'b', tool_use_id: 'e2' })
  expect((await composed($))[1]!.text).not.toContain('no semicolons')
})

test('a Write of .editorconfig also refreshes the section', async ($, on) => {
  const files: Record<string, string> = { '.editorconfig': '[*]\nend_of_line = lf\n' }
  project(on, files)
  on('tool.call', { tool: 'Write' }, () => ({ result: undefined as never }))

  expect((await composed($))[1]!.text).toContain('lf line endings')

  files['.editorconfig'] = '[*]\nend_of_line = crlf\n'
  await $.tool.call({ tool: 'Write', file_path: '/work/.editorconfig', content: 'x', tool_use_id: 'w1' })
  expect((await composed($))[1]!.text).toContain('crlf line endings')
})
