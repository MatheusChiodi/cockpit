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
  project(on, "pom.xml", "<project/>")

  const composed = await $.prompt.compose(COMPOSE)
  expect(composed.sections.map(s => s.id)).toContain('java-rules:rules')
})

test('adds nothing when the stack is absent', async ($, on) => {
  project(on, "package.json", "{}")

  const composed = await $.prompt.compose(COMPOSE)
  expect(composed.sections).toEqual([])
})

test('recognizes a Gradle build, Groovy or Kotlin', async ($, on) => {
  project(on, 'build.gradle.kts', 'plugins { java }')

  const composed = await $.prompt.compose(COMPOSE)
  expect(composed.sections.map(s => s.id)).toEqual(['java-rules:rules'])
})

test('recognizes a Groovy Gradle build', async ($, on) => {
  project(on, 'build.gradle', "apply plugin: 'java'")

  expect((await $.prompt.compose(COMPOSE)).sections.map(s => s.id)).toEqual(['java-rules:rules'])
})

test('keeps the sections beneath and adds its own last, for the session, in English', async ($, on) => {
  on('session.root', () => ({ value: '/work' }))
  on('prompt.compose', () => ({ sections: [{ id: 'other', text: 'kept', scope: 'session' as const }] }))
  on('fs.exists', (_: unknown, e: { path: string }) => ({ value: e.path.endsWith('pom.xml') }))

  const composed = await $.prompt.compose(COMPOSE)
  expect(composed.sections.map(s => s.id)).toEqual(['other', 'java-rules:rules'])

  const section = composed.sections[1] as { text: string; scope: string }
  expect(section.scope).toBe('session')
  expect(section.text.startsWith('# Java rules\n')).toBe(true)
  expect(section.text).toContain('try-with-resources')
})

test('looks at the build files once, not on every prompt', async ($, on) => {
  let checks = 0
  on('session.root', () => ({ value: '/work' }))
  on('prompt.compose', () => ({ sections: [] }))
  on('fs.exists', (_: unknown, e: { path: string }) => {
    checks += 1

    return { value: e.path.endsWith('pom.xml') }
  })

  await $.prompt.compose(COMPOSE)
  const first = checks
  await $.prompt.compose(COMPOSE)
  await $.prompt.compose(COMPOSE)
  expect(first).toBeGreaterThan(0)
  expect(checks).toBe(first)
})
