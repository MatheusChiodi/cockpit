import { expect, test } from 'claude-code/testing'

const INPUT = { model: 'claude-test', promptModel: 'claude-test', surfaces: ['terminal'], tools: [], outputStyle: null, traits: [] } as never

// Paths are read relative to /work, whatever the separator.
const project = (on: any, files: Record<string, string>) => {
  const key = (path: string) => path.slice(path.indexOf('work') + 5).replace(/[^\w.-]+/g, '/')

  on('session.root', () => ({ value: '/work' }))
  on('fs.read', (_: unknown, e: { path: string }) => (key(e.path) in files ? { value: files[key(e.path)] } : { deny: 'ENOENT' }))
  on('prompt.compose', () => ({ sections: [{ id: 'other', text: 'kept', scope: 'session' as const }] }))
  on('tool.call', { tool: 'Write' }, () => ({ result: undefined as never }))
}

const composed = async ($: any): Promise<{ id: string; text: string }[]> => (await $.prompt.compose(INPUT)).sections

test('gives the title and the first paragraph, past badges and images', async ($, on) => {
  project(on, {
    'README.md': '# Billing\n\n[![ci](https://x/y.svg)](https://x)\n![logo](logo.png)\n<p align="center">x</p>\n\nA small CLI that syncs\ninvoices to the ledger.\n\n## Install\n\nnpm i\n',
  })

  const sections = await composed($)
  expect(sections.map(s => s.id)).toEqual(['other', 'readme-context:readme'])

  const text = sections[1]!.text
  expect(text).toContain('# About this project (README.md)')
  expect(text).toContain('Billing: A small CLI that syncs invoices to the ledger.')
  expect(text).not.toContain('Install')
  expect(text).not.toContain('logo')
})

test('cuts a long paragraph', async ($, on) => {
  project(on, { 'README.md': `${'word '.repeat(100)}` })

  const text = (await composed($))[1]!.text
  expect(text.endsWith('…')).toBe(true)
  expect(text.length).toBeLessThan(400)
})

test('drops a paragraph that carries something that looks like a token', async ($, on) => {
  const leak = `ghp_${'a1B2'.repeat(9)}`
  project(on, { 'README.md': `# App\n\nSet the token ${leak} before running.\n` })

  expect((await composed($)).map(s => s.id)).toEqual(['other'])
})

test('reads once and refreshes after the README is written', async ($, on) => {
  const files: Record<string, string> = { 'README.md': '# A\n\nfirst version\n' }
  project(on, files)

  expect((await composed($))[1]!.text).toContain('first version')

  files['README.md'] = '# A\n\nsecond version\n'
  expect((await composed($))[1]!.text).toContain('first version')

  await $.tool.call({ tool: 'Write', file_path: '/work/README.md', content: 'x', tool_use_id: 'w1' })
  expect((await composed($))[1]!.text).toContain('second version')
})

test('adds nothing without a README or with only headings', async ($, on) => {
  project(on, { 'README.md': '# Only a title\n\n## And another\n' })

  expect((await composed($)).map(s => s.id)).toEqual(['other'])
})

test('falls back to a README without an extension and works without a title', async ($, on) => {
  project(on, { README: 'Plain text readme for the tool.\n' })

  const text = (await composed($))[1]!.text
  expect(text).toBe('# About this project (README)\nPlain text readme for the tool.')
})

test('adds nothing when there is no README at all', async ($, on) => {
  project(on, {})

  expect((await composed($)).map(s => s.id)).toEqual(['other'])
})

test('skips rules, tables and code fences before the paragraph', async ($, on) => {
  project(on, { 'README.md': '# Tool\n---\n| a | b |\n```\n\nThe real description.\n' })

  expect((await composed($))[1]!.text).toContain('Tool: The real description.')
})

test('an Edit of the README refreshes it, an edit elsewhere does not', async ($, on) => {
  const files: Record<string, string> = { 'README.md': '# A\n\nfirst version\n' }
  project(on, files)
  on('tool.call', { tool: 'Edit' }, () => ({ result: undefined as never }))

  expect((await composed($))[1]!.text).toContain('first version')
  files['README.md'] = '# A\n\nsecond version\n'

  await $.tool.call({ tool: 'Edit', file_path: '/work/src/readme-parser.ts', old_string: 'a', new_string: 'b', tool_use_id: 'e1' })
  expect((await composed($))[1]!.text).toContain('first version')

  await $.tool.call({ tool: 'Edit', file_path: 'C:\\work\\readme.md', old_string: 'a', new_string: 'b', tool_use_id: 'e2' })
  expect((await composed($))[1]!.text).toContain('second version')
})

test('the section is scoped to the session', async ($, on) => {
  project(on, { 'README.md': 'Hello.\n' })

  const sections = (await $.prompt.compose(INPUT)).sections
  expect(sections[1]?.scope).toBe('session')
})
