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

test('points at the file with its path, line count and headings', async ($, on) => {
  project(on, { '.github/CONTRIBUTING.md': '# Contributing\n\n## Setup\nnpm i\n\n## Branches\nfeat/x\n\n### Not listed\n\n## Review\n' })

  const sections = await composed($)
  expect(sections.map(s => s.id)).toEqual(['other', 'conventions-context:file'])

  const text = sections[1]!.text
  expect(text).toContain('.github/CONTRIBUTING.md (11 lines): Setup, Branches, Review')
  expect(text).not.toContain('Not listed')
  expect(text).not.toContain('npm i')
})

test('prefers the root file and lists at most six headings', async ($, on) => {
  project(on, {
    'CONTRIBUTING.md': Array.from({ length: 9 }, (_, i) => `## H${i}`).join('\n'),
    'CONVENTIONS.md': '## Other',
  })

  const text = (await composed($))[1]!.text
  expect(text).toContain('CONTRIBUTING.md (9 lines): H0, H1, H2, H3, H4, H5')
  expect(text).not.toContain('H6')
  expect(text).not.toContain('Other')
})

test('reads once and refreshes after the file is edited', async ($, on) => {
  const files: Record<string, string> = { 'CONVENTIONS.md': '## One\n' }
  project(on, files)

  expect((await composed($))[1]!.text).toContain('One')

  files['CONVENTIONS.md'] = '## Two\n'
  expect((await composed($))[1]!.text).toContain('One')

  await $.tool.call({ tool: 'Edit', file_path: '/work/CONVENTIONS.md', old_string: 'a', new_string: 'b', tool_use_id: 'e1' })
  expect((await composed($))[1]!.text).toContain('Two')
})

test('adds nothing without a conventions file', async ($, on) => {
  project(on, { 'README.md': '# x' })

  expect((await composed($)).map(s => s.id)).toEqual(['other'])
})

test('a Write of the conventions file refreshes the section too', async ($, on) => {
  const files: Record<string, string> = { 'STYLEGUIDE.md': '## Tabs\n' }
  project(on, files)
  on('tool.call', { tool: 'Write' }, () => ({ result: undefined as never }))

  expect((await composed($))[1]!.text).toContain('Tabs')

  files['STYLEGUIDE.md'] = '## Spaces\n'
  await $.tool.call({ tool: 'Write', file_path: 'C:\\work\\STYLEGUIDE.md', content: '## Spaces\n', tool_use_id: 'w1' })
  expect((await composed($))[1]!.text).toContain('Spaces')
})

test('an edit of an unrelated file keeps the cached section', async ($, on) => {
  const files: Record<string, string> = { 'CONVENTIONS.md': '## One\n' }
  project(on, files)

  expect((await composed($))[1]!.text).toContain('One')

  files['CONVENTIONS.md'] = '## Two\n'
  await $.tool.call({ tool: 'Edit', file_path: '/work/src/app.ts', old_string: 'a', new_string: 'b', tool_use_id: 'e1' })
  await $.tool.call({ tool: 'Edit', file_path: '/work/MYCONVENTIONS.md', old_string: 'a', new_string: 'b', tool_use_id: 'e2' })
  expect((await composed($))[1]!.text).toContain('One')
})

test('a file without second-level headings is named with its line count only', async ($, on) => {
  project(on, { 'docs/style-guide.md': '# Style\nUse tabs.\n' })

  const text = (await composed($))[1]!.text
  expect(text).toBe(['# Conventions file', 'docs/style-guide.md (2 lines)', 'Read it before writing code or opening a pull request.'].join('\n'))
})

test('follows the order of the candidates', async ($, on) => {
  project(on, { 'docs/conventions.md': '## Late', 'docs/CONTRIBUTING.md': '## Early' })

  const text = (await composed($))[1]!.text
  expect(text).toContain('docs/CONTRIBUTING.md (1 line): Early')
  expect(text).not.toContain('Late')
})
