import { expect, test } from 'claude-code/testing'

const INPUT = { model: 'claude-test', promptModel: 'claude-test', surfaces: ['terminal'], tools: [], outputStyle: null, traits: [] } as never

// The project's files by name, read live from `files`; the sections beneath come from `below`.
const project = (on: any, files: Record<string, string>, below: { id: string; text: string; scope: 'session' }[] = []) => {
  const fileOf = (path: string) => path.replaceAll('\\', '/').split('/').pop() ?? ''

  on('session.root', () => ({ value: '/work' }))
  on('fs.exists', (_: unknown, e: { path: string }) => ({ value: fileOf(e.path) in files }))
  on('fs.read', (_: unknown, e: { path: string }) => ({ value: files[fileOf(e.path)] ?? '' }))
  on('prompt.compose', () => ({ sections: below }))
}

const composed = async ($: any): Promise<{ id: string; text: string; scope: string }[]> =>
  (await $.prompt.compose(INPUT)).sections

test('adds the stack of the project to the system prompt, from dependencies and marker files', async ($, on) => {
  project(on, {
    'package.json': JSON.stringify({
      dependencies: { react: '^18', next: '^14', 'left-pad': '1' },
      devDependencies: { typescript: '^5', vitest: '^1', tailwindcss: '^3' },
    }),
    'eas.json': '{}',
    'pom.xml': '<project/>',
  })

  const sections = await composed($)
  expect(sections.map(section => section.id)).toEqual(['stack-context:stack'])

  const text = sections[0]!.text
  expect(text).toContain("# This project's stack")

  for (const label of ['Next.js', 'React', 'Tailwind CSS', 'TypeScript', 'Vitest', 'Java (Maven)', 'EAS Build']) {
    expect(text, label).toContain(label)
  }

  expect(text).not.toContain('left-pad')
  expect(text).not.toContain('Vue')
  expect(text).toContain('do not propose changing the stack unless asked')
  expect(sections[0]!.scope).toBe('session')
})

test('keeps the sections beneath and reads the stack only once', async ($, on) => {
  const files: Record<string, string> = { 'package.json': JSON.stringify({ dependencies: { vue: '3' } }) }
  project(on, files, [{ id: 'other', text: 'kept', scope: 'session' }])

  const first = await composed($)
  expect(first.map(section => section.id)).toEqual(['other', 'stack-context:stack'])
  expect(first[1]!.text).toContain('Vue')

  files['package.json'] = JSON.stringify({ dependencies: { svelte: '4' } })
  const second = await composed($)
  expect(second[1]!.text).toContain('Vue')
  expect(second[1]!.text).not.toContain('Svelte')
})

test('adds nothing for a folder with no known stack', async ($, on) => {
  project(on, { 'README.md': '' })

  expect(await composed($)).toEqual([])
})

test('survives an invalid package.json and still reads the marker files', async ($, on) => {
  project(on, { 'package.json': '{ nope', 'Cargo.toml': '' })

  const sections = await composed($)
  expect(sections[0]!.text).toContain('Rust')
})

test('names a stack once even when two marker files point to it', async ($, on) => {
  project(on, { 'requirements.txt': 'flask', 'pyproject.toml': '[project]' })

  const sections = await composed($)
  expect(sections[0]!.text).toBe(
    "# This project's stack\nPython.\nUse the patterns and APIs of these tools; do not propose changing the stack unless asked.",
  )
})

test('lists dependencies in a fixed order, then the marker files', async ($, on) => {
  project(on, {
    'package.json': JSON.stringify({ devDependencies: { jest: '29', '@nestjs/core': '10', prisma: '5' } }),
    'go.mod': 'module x',
  })

  expect((await composed($))[0]!.text).toContain('\nNestJS, Prisma, Jest, Go.\n')
})

test('reads the marker files when there is no package.json', async ($, on) => {
  const fileOf = (path: string) => path.replaceAll('/', '|').split('|').pop() ?? ''
  on('session.root', () => ({ value: '/work' }))
  on('fs.exists', (_: unknown, e: { path: string }) => ({ value: ['build.gradle', 'app.json'].some(name => e.path.endsWith(name)) }))
  on('fs.read', (_: unknown, e: { path: string }) => (fileOf(e.path).endsWith('package.json') ? { deny: 'ENOENT' } : { value: '' }))
  on('prompt.compose', () => ({ sections: [] }))

  expect((await composed($))[0]!.text).toContain('\nJava/Kotlin (Gradle), Expo (app.json).\n')
})

test('a package.json without known dependencies adds nothing and keeps the sections beneath', async ($, on) => {
  project(on, { 'package.json': JSON.stringify({ dependencies: { lodash: '4' } }) }, [{ id: 'other', text: 'kept', scope: 'session' }])

  expect((await composed($)).map(section => section.id)).toEqual(['other'])
})
