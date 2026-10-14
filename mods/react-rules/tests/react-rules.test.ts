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
  project(on, "package.json", "{\"dependencies\":{\"react\":\"19\"}}")

  const composed = await $.prompt.compose(COMPOSE)
  expect(composed.sections.map(s => s.id)).toContain('react-rules:rules')
})

test('adds nothing when the stack is absent', async ($, on) => {
  project(on, "package.json", "{\"dependencies\":{\"vue\":\"3\"}}")

  const composed = await $.prompt.compose(COMPOSE)
  expect(composed.sections).toEqual([])
})
