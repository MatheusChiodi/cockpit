import { expect, test } from 'claude-code/testing'

const INPUT = { model: 'claude-test', promptModel: 'claude-test', surfaces: ['terminal'], tools: [], outputStyle: null, traits: [] } as never

const dir = (name: string) => ({ name, kind: 'dir' as const, size: 0, mtimeMs: 0, isLink: false })

// Paths are read relative to /work, whatever the separator.
const project = (on: any, files: Record<string, string>, folders: Record<string, string[]> = {}) => {
  const key = (path: string) => path.slice(path.indexOf('work') + 5).replace(/[^\w.-]+/g, '/')

  on('session.root', () => ({ value: '/work' }))
  on('fs.read', (_: unknown, e: { path: string }) => (key(e.path) in files ? { value: files[key(e.path)] } : { deny: 'ENOENT' }))
  on('fs.list', (_: unknown, e: { path: string }) => ({ value: (folders[key(e.path)] ?? []).map(dir) }))
  on('prompt.compose', () => ({ sections: [{ id: 'other', text: 'kept', scope: 'session' as const }] }))
  on('tool.call', { tool: 'Edit' }, () => ({ result: undefined as never }))
}

const composed = async ($: any): Promise<{ id: string; text: string }[]> => (await $.prompt.compose(INPUT)).sections

test('lists the packages of package.json workspaces with their names', async ($, on) => {
  project(
    on,
    {
      'package.json': JSON.stringify({ workspaces: ['apps/*', 'tools/cli'] }),
      'apps/web/package.json': JSON.stringify({ name: '@acme/web' }),
      'apps/api/package.json': JSON.stringify({ name: '@acme/api' }),
    },
    { apps: ['web', 'api', '.cache'] },
  )

  const sections = await composed($)
  expect(sections.map(s => s.id)).toEqual(['other', 'workspace-context:packages'])

  const text = sections[1]!.text
  expect(text).toContain('- @acme/web: apps/web')
  expect(text).toContain('- @acme/api: apps/api')
  expect(text).toContain('- tools/cli')
  expect(text).not.toContain('.cache')
})

test('reads pnpm-workspace.yaml, skips negations, and lists Maven modules', async ($, on) => {
  project(
    on,
    {
      'pnpm-workspace.yaml': "packages:\n  - 'packages/*'\n  - '!packages/legacy'\n",
      'pom.xml': '<modules><module>core</module><module>web</module></modules>',
      'packages/ui/package.json': '{ nope',
    },
    { packages: ['ui'] },
  )

  const text = (await composed($))[1]!.text
  expect(text).toContain('- packages/ui')
  expect(text).toContain('- core')
  expect(text).toContain('- web')
  expect(text).not.toContain('legacy')
})

test('reads once and refreshes after package.json is edited', async ($, on) => {
  const files: Record<string, string> = { 'package.json': JSON.stringify({ workspaces: { packages: ['a'] } }) }
  project(on, files)

  expect((await composed($))[1]!.text).toContain('- a')

  files['package.json'] = JSON.stringify({ workspaces: ['b'] })
  expect((await composed($))[1]!.text).toContain('- a')

  await $.tool.call({ tool: 'Edit', file_path: '/work/package.json', old_string: 'a', new_string: 'b', tool_use_id: 'e1' })
  expect((await composed($))[1]!.text).toContain('- b')
})

test('adds nothing for a single package project', async ($, on) => {
  project(on, { 'package.json': JSON.stringify({ name: 'solo' }) })

  expect((await composed($)).map(s => s.id)).toEqual(['other'])
})

test('lists at most fifteen packages and counts the rest', async ($, on) => {
  const names = Array.from({ length: 18 }, (_, at) => `p${String(at).padStart(2, '0')}`)
  project(on, { 'package.json': JSON.stringify({ workspaces: ['packages/*'] }) }, { packages: names })

  const text = (await composed($))[1]!.text
  expect(text.split('\n').filter(line => line.startsWith('- packages/'))).toHaveLength(15)
  expect(text).toContain('- packages/p14')
  expect(text).not.toContain('- packages/p15')
  expect(text.endsWith('- … 3 more')).toBe(true)
})

test('lists a folder once even when two patterns name it, and skips deep globs', async ($, on) => {
  project(
    on,
    { 'package.json': JSON.stringify({ workspaces: ['libs/*', './libs/core/', 'apps/*/inner'] }) },
    { libs: ['core'], apps: ['web'] },
  )

  const text = (await composed($))[1]!.text
  expect(text.match(/- libs\/core/g)).toHaveLength(1)
  expect(text).not.toContain('apps/')
})

test('lists the folders of a ** pattern and leaves out files', async ($, on) => {
  on('session.root', () => ({ value: '/work' }))
  on('fs.read', (_: unknown, e: { path: string }) =>
    e.path.replaceAll('\\', '/').endsWith('/work/package.json')
      ? { value: JSON.stringify({ workspaces: ['modules/**'] }) }
      : { deny: 'ENOENT' },
  )
  on('fs.list', () => ({
    value: [
      { name: 'auth', kind: 'dir' as const, size: 0, mtimeMs: 0, isLink: false },
      { name: 'README.md', kind: 'file' as const, size: 10, mtimeMs: 0, isLink: false },
    ],
  }))
  on('prompt.compose', () => ({ sections: [] }))

  const text = (await composed($))[0]!.text
  expect(text).toContain('- modules/auth')
  expect(text).not.toContain('README')
})

test('an invalid package.json still lets pnpm and Maven count', async ($, on) => {
  project(on, { 'package.json': '{ nope', 'pom.xml': '<module> service </module>' })

  const text = (await composed($))[1]!.text
  expect(text).toBe('# Workspace packages (monorepo)\n- service')
})

test('a Write of pnpm-workspace.yaml refreshes the section, other files do not', async ($, on) => {
  const files: Record<string, string> = { 'pnpm-workspace.yaml': 'packages:\n  - tools\n' }
  project(on, files)
  on('tool.call', { tool: 'Write' }, () => ({ result: undefined as never }))

  expect((await composed($))[1]!.text).toContain('- tools')

  files['pnpm-workspace.yaml'] = 'packages:\n  - scripts\n'
  await $.tool.call({ tool: 'Write', file_path: '/work/src/index.ts', content: 'x', tool_use_id: 'w1' })
  expect((await composed($))[1]!.text).toContain('- tools')

  await $.tool.call({ tool: 'Write', file_path: '/work/pnpm-workspace.yaml', content: 'x', tool_use_id: 'w2' })
  expect((await composed($))[1]!.text).toContain('- scripts')
})
