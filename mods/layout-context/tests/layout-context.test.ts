import { expect, test } from 'claude-code/testing'

const INPUT = { model: 'claude-test', promptModel: 'claude-test', surfaces: ['terminal'], tools: [], outputStyle: null, traits: [] } as never

// The folders by path relative to /work, read live from `tree`.
const project = (on: any, tree: Record<string, string[]>) => {
  on('session.root', () => ({ value: '/work' }))
  on('fs.list', (_: unknown, e: { path: string }) => ({
    value: (tree[e.path.replaceAll('\\', '/').replace(/^.*\/work\/?/, '')] ?? []).map(name => ({ name, kind: name.includes('.') && !name.startsWith('.') ? 'file' : 'dir', size: 0, mtimeMs: 0, isLink: false })),
  }))
  on('prompt.compose', () => ({ sections: [{ id: 'other', text: 'kept', scope: 'session' as const }] }))
  on('tool.call', { tool: 'Write' }, () => ({ result: undefined as never }))
}

const composed = async ($: any): Promise<{ id: string; text: string }[]> => (await $.prompt.compose(INPUT)).sections

test('lists folders two levels deep and skips dependencies, build output and dot folders', async ($, on) => {
  project(on, {
    '': ['src', 'tests', 'node_modules', 'dist', '.git', 'package.json', 'scripts'],
    src: ['components', 'hooks', 'index.ts'],
    tests: ['unit', 'e2e'],
    scripts: [],
  })

  const sections = await composed($)
  expect(sections.map(s => s.id)).toEqual(['other', 'layout-context:layout'])

  const text = sections[1]!.text
  expect(text).toContain('- scripts/')
  expect(text).toContain('- src/: components, hooks')
  expect(text).toContain('- tests/: e2e, unit')
  expect(text).not.toContain('node_modules')
  expect(text).not.toContain('dist')
  expect(text).not.toContain('.git')
  expect(text).not.toContain('index.ts')
})

test('caps the second level and refreshes after a Write near the root', async ($, on) => {
  const tree: Record<string, string[]> = { '': ['src'], src: Array.from({ length: 11 }, (_, i) => `d${String(i).padStart(2, '0')}`) }
  project(on, tree)

  expect((await composed($))[1]!.text).toContain('d07, +3')

  tree[''] = ['src', 'docs']
  expect((await composed($))[1]!.text).not.toContain('docs')

  await $.tool.call({ tool: 'Write', file_path: '/work/docs/a.md', content: 'x', tool_use_id: 'w1' })
  expect((await composed($))[1]!.text).toContain('- docs/')
})

test('adds nothing when the folder has no sub folders', async ($, on) => {
  project(on, { '': ['README.md', 'node_modules'] })

  expect((await composed($)).map(s => s.id)).toEqual(['other'])
})

test('lists 14 top folders and counts the rest', async ($, on) => {
  const top = Array.from({ length: 17 }, (_, i) => `f${String(i).padStart(2, '0')}`)
  project(on, { '': top })

  const text = (await composed($))[1]!.text
  expect(text).toContain('- f13/')
  expect(text).not.toContain('- f14/')
  expect(text.split('\n').at(-1)).toBe('- … 3 more folders')
})

test('a Write deep in the tree keeps the layout it already read', async ($, on) => {
  const tree: Record<string, string[]> = { '': ['src'], src: ['a'] }
  project(on, tree)

  expect((await composed($))[1]!.text).toContain('- src/: a')

  tree.src = ['a', 'b']
  await $.tool.call({ tool: 'Write', file_path: '/work/src/a/deep/file.ts', content: 'x', tool_use_id: 'w2' })
  expect((await composed($))[1]!.text).toBe('# Folder layout (two levels, folders only)\n- src/: a')

  await $.tool.call({ tool: 'Write', file_path: '/work/src/b/file.ts', content: 'x', tool_use_id: 'w3' })
  expect((await composed($))[1]!.text).toContain('- src/: a, b')
})
