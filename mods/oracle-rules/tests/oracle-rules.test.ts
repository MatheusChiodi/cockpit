import { expect, test } from 'claude-code/testing'

const COMPOSE = { model: 'claude-test', promptModel: 'claude-test', surfaces: ['terminal'], tools: [], outputStyle: null, traits: [] } as const

// The project's files by name; the engine resolves paths against the host, so match on the file name.
const project = (on: any, file: string, text: string) => {
  const fileOf = (path: string) => path.replaceAll('\\', '/').split('/').pop() ?? ''

  on('session.root', () => ({ value: '/work' }))
  on('prompt.compose', () => ({ sections: [] }))
  on('fs.read', (_: unknown, e: { path: string }) => ({ value: fileOf(e.path) === file ? text : '' }))
  on('fs.exists', (_: unknown, e: { path: string }) => ({ value: fileOf(e.path) === file }))
}

test('adds its section when the stack is present', async ($, on) => {
  project(on, "pom.xml", "<artifactId>ojdbc8</artifactId>")

  const composed = await $.prompt.compose(COMPOSE)
  expect(composed.sections.map(s => s.id)).toContain('oracle-rules:rules')
})

test('adds nothing when the stack is absent', async ($, on) => {
  project(on, "pom.xml", "<artifactId>postgresql</artifactId>")

  const composed = await $.prompt.compose(COMPOSE)
  expect(composed.sections).toEqual([])
})

// Files by name; a file not listed is refused, as the engine refuses a missing one. Counts the reads.
const files = (on: any, held: Record<string, string>) => {
  const fileOf = (path: string) => path.replaceAll('\\', '/').split('/').pop() ?? ''
  const reads = { count: 0 }

  on('session.root', () => ({ value: '/work' }))
  on('prompt.compose', () => ({ sections: [{ id: 'other', text: 'kept', scope: 'session' as const }] }))
  on('fs.read', (_: unknown, e: { path: string }) => {
    reads.count += 1

    return fileOf(e.path) in held ? { value: held[fileOf(e.path)] } : { deny: 'ENOENT' }
  })
  on('fs.exists', (_: unknown, e: { path: string }) => ({ value: fileOf(e.path) in held }))

  return reads
}

test('detects the driver in a Gradle Kotlin build', async ($, on) => {
  files(on, { 'build.gradle.kts': 'implementation("com.oracle.database.jdbc:ojdbc11:23.3.0.23.09")' })

  const ids = (await $.prompt.compose(COMPOSE)).sections.map(s => s.id)
  expect(ids).toEqual(['other', 'oracle-rules:rules'])
})

test('detects oracledb among the devDependencies of package.json', async ($, on) => {
  files(on, { 'package.json': JSON.stringify({ devDependencies: { oracledb: '6.0.0' } }) })

  const section = (await $.prompt.compose(COMPOSE)).sections.find(s => s.id === 'oracle-rules:rules')
  expect(section?.text).toContain('ROWNUM')
  expect(section?.scope).toBe('session')
})

test('adds nothing for an invalid package.json or a project with no files', async ($, on) => {
  files(on, { 'package.json': '{ "dependencies": { "oracledb"' })

  expect((await $.prompt.compose(COMPOSE)).sections.map(s => s.id)).toEqual(['other'])
})

test('looks at the project once, then keeps the answer', async ($, on) => {
  const reads = files(on, { 'pom.xml': '<artifactId>ojdbc8</artifactId>' })

  await $.prompt.compose(COMPOSE)
  const first = reads.count
  const again = await $.prompt.compose(COMPOSE)

  expect(first).toBeGreaterThan(0)
  expect(reads.count).toBe(first)
  expect(again.sections.map(s => s.id)).toEqual(['other', 'oracle-rules:rules'])
})
