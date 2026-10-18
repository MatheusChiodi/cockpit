import { expect, test } from 'claude-code/testing'

const INPUT = { model: 'claude-test', promptModel: 'claude-test', surfaces: ['terminal'], tools: [], outputStyle: null, traits: [] } as never

const entry = (name: string) => ({ name, kind: 'file' as const, size: 1, mtimeMs: 0, isLink: false })

// Paths are read relative to /work, whatever the separator: `files` holds file texts, `folders` the entries per folder.
const project = (on: any, files: Record<string, string>, folders: Record<string, string[]> = {}) => {
  const key = (path: string) => path.slice(path.indexOf('work') + 5).replace(/[^\w.-]+/g, '/')

  on('session.root', () => ({ value: '/work' }))
  on('fs.exists', (_: unknown, e: { path: string }) => ({ value: key(e.path) in files }))
  on('fs.read', (_: unknown, e: { path: string }) => (key(e.path) in files ? { value: files[key(e.path)] } : { deny: 'ENOENT' }))
  on('fs.list', (_: unknown, e: { path: string }) => ({ value: (folders[key(e.path)] ?? []).map(entry) }))
  on('prompt.compose', () => ({ sections: [{ id: 'other', text: 'kept', scope: 'session' as const }] }))
  on('tool.call', { tool: 'Edit' }, () => ({ result: undefined as never }))
}

const composed = async ($: any): Promise<{ id: string; text: string }[]> => (await $.prompt.compose(INPUT)).sections

test('names the framework, the test folders and the file naming', async ($, on) => {
  project(
    on,
    { 'package.json': JSON.stringify({ devDependencies: { vitest: '1', '@playwright/test': '1', left: '1' } }) },
    { tests: ['login.test.ts', 'helpers.ts'], e2e: ['flow.spec.ts'] },
  )

  const sections = await composed($)
  expect(sections.map(s => s.id)).toEqual(['other', 'test-setup-context:tests'])

  const text = sections[1]!.text
  expect(text).toContain('- Framework: Vitest, Playwright')
  expect(text).toContain('- Test folders: tests/, e2e/')
  expect(text).toContain('- File naming: *.test.ts')
  expect(text).not.toContain('left')
})

test('recognizes non-JavaScript projects by their marker files', async ($, on) => {
  project(on, { 'pom.xml': '<project/>', 'pytest.ini': '' })

  const text = (await composed($))[1]!.text
  expect(text).toContain('JUnit/Maven')
  expect(text).toContain('pytest')
  expect(text).not.toContain('Test folders')
})

test('reads once and refreshes after package.json is edited', async ($, on) => {
  const files: Record<string, string> = { 'package.json': JSON.stringify({ devDependencies: { jest: '1' } }) }
  project(on, files)

  expect((await composed($))[1]!.text).toContain('Jest')

  files['package.json'] = JSON.stringify({ devDependencies: { mocha: '1' } })
  expect((await composed($))[1]!.text).toContain('Jest')

  await $.tool.call({ tool: 'Edit', file_path: '/work/package.json', old_string: 'a', new_string: 'b', tool_use_id: 'e1' })
  expect((await composed($))[1]!.text).toContain('Mocha')
})

test('adds nothing for a project with no tests', async ($, on) => {
  project(on, { 'package.json': '{}' })

  expect((await composed($)).map(s => s.id)).toEqual(['other'])
})

test('an invalid package.json still leaves the marker files, each label once', async ($, on) => {
  project(on, { 'package.json': '{ broken', 'pytest.ini': '', 'conftest.py': '' }, { 'src/__tests__': ['app.spec.js'] })

  const text = (await composed($))[1]!.text
  expect(text).toContain('- Framework: pytest\n')
  expect(text).toContain('- Test folders: src/__tests__/')
  expect(text).toContain('- File naming: *.spec.js')
})

test('a Write of package.json refreshes, an edit of another file does not', async ($, on) => {
  const files: Record<string, string> = { 'package.json': JSON.stringify({ devDependencies: { jest: '1' } }) }
  project(on, files)
  on('tool.call', { tool: 'Write' }, () => ({ result: undefined as never }))

  expect((await composed($))[1]!.text).toContain('Jest')
  files['package.json'] = JSON.stringify({ dependencies: { supertest: '1' } })

  await $.tool.call({ tool: 'Edit', file_path: '/work/my-package.json', old_string: 'a', new_string: 'b', tool_use_id: 'e1' })
  expect((await composed($))[1]!.text).toContain('Jest')

  await $.tool.call({ tool: 'Write', file_path: 'C:\\work\\package.json', content: '{}', tool_use_id: 'w1' })
  expect((await composed($))[1]!.text).toContain('- Framework: Supertest')
})

test('a folder without test-named files gives no naming line', async ($, on) => {
  project(on, {}, { test: ['helpers.py', 'data'] })

  const sections = await composed($)
  expect(sections[1]!.text).toBe('# Tests\n- Test folders: test/\n- New tests go next to these, in the same framework and naming.')
})
