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

test('lists the pins of nvmrc, tool-versions, engines and packageManager', async ($, on) => {
  project(on, {
    '.nvmrc': 'v20.11.0\n',
    '.python-version': '3.12.1\n',
    '.tool-versions': '# comment\nnodejs 20.11.0\nruby 3.3.0\n',
    'package.json': JSON.stringify({ engines: { node: '>=20', npm: '>=10' }, packageManager: 'pnpm@9.1.0' }),
  })

  const sections = await composed($)
  expect(sections.map(s => s.id)).toEqual(['other', 'runtime-pin-context:runtimes'])

  const text = sections[1]!.text
  expect(text).toContain('- node v20.11.0 (.nvmrc)')
  expect(text).toContain('- python 3.12.1 (.python-version)')
  expect(text).toContain('- ruby 3.3.0 (.tool-versions)')
  expect(text).toContain('- engines.node: >=20')
  expect(text).toContain('- packageManager: pnpm@9.1.0')
  expect(text).not.toContain('comment')
})

test('reads the Java version of a pom and ignores a pin file that is not a version', async ($, on) => {
  project(on, { 'pom.xml': '<properties><java.version>17</java.version></properties>', '.nvmrc': 'lts/*\n' })

  const text = (await composed($))[1]!.text
  expect(text).toContain('- java 17 (pom.xml)')
  expect(text).not.toContain('lts')
})

test('reads once and refreshes after a pin file is written', async ($, on) => {
  const files: Record<string, string> = { '.nvmrc': '18\n' }
  project(on, files)

  expect((await composed($))[1]!.text).toContain('node 18')

  files['.nvmrc'] = '22\n'
  expect((await composed($))[1]!.text).toContain('node 18')

  await $.tool.call({ tool: 'Edit', file_path: '/work/.nvmrc', old_string: 'a', new_string: 'b', tool_use_id: 'e1' })
  expect((await composed($))[1]!.text).toContain('node 22')
})

test('adds nothing for a project with no pins', async ($, on) => {
  project(on, { 'package.json': '{}' })

  expect((await composed($)).map(s => s.id)).toEqual(['other'])
})

test('names node once when both .nvmrc and .node-version pin it', async ($, on) => {
  project(on, { '.nvmrc': '20\n', '.node-version': '18.0.0\n' })

  const text = (await composed($))[1]!.text
  expect(text).toBe('# Pinned runtimes\n- node 20 (.nvmrc)')
})

test('falls back to .node-version and reads maven.compiler.release', async ($, on) => {
  project(on, {
    '.node-version': 'v18.19.0\n',
    'pom.xml': '<properties>\n  <maven.compiler.release> 21 </maven.compiler.release>\n</properties>',
  })

  const text = (await composed($))[1]!.text
  expect(text).toContain('- node v18.19.0 (.node-version)')
  expect(text).toContain('- java 21 (pom.xml)')
})

test('keeps the pin files when package.json is not valid JSON', async ($, on) => {
  project(on, { '.python-version': '3.11\n', 'package.json': '{ broken' })

  expect((await composed($))[1]!.text).toBe('# Pinned runtimes\n- python 3.11 (.python-version)')
})

test('skips .tool-versions lines without a version or with an alias', async ($, on) => {
  project(on, { '.tool-versions': 'nodejs\npython system\nterraform 1.7.5\n\n' })

  expect((await composed($))[1]!.text).toBe('# Pinned runtimes\n- terraform 1.7.5 (.tool-versions)')
})

test('a write to another file keeps the cache; a write to package.json clears it', async ($, on) => {
  const files: Record<string, string> = { 'package.json': JSON.stringify({ engines: { node: '>=18' } }) }
  project(on, files)
  on('tool.call', { tool: 'Write' }, () => ({ result: undefined as never }))

  expect((await composed($))[1]!.text).toContain('engines.node: >=18')

  files['package.json'] = JSON.stringify({ engines: { node: '>=22' } })
  await $.tool.call({ tool: 'Write', file_path: '/work/src/mypackage.json', content: '{}', tool_use_id: 'w1' })
  expect((await composed($))[1]!.text).toContain('engines.node: >=18')

  await $.tool.call({ tool: 'Write', file_path: '/work/package.json', content: '{}', tool_use_id: 'w2' })
  expect((await composed($))[1]!.text).toContain('engines.node: >=22')
})

test('adds the section once per session scope, after what was beneath', async ($, on) => {
  project(on, { '.nvmrc': '20\n' })

  const sections = (await $.prompt.compose(INPUT)).sections as readonly { id: string; scope: string }[]
  expect(sections.map(s => `${s.id}:${s.scope}`)).toEqual(['other:session', 'runtime-pin-context:runtimes:session'])
})
