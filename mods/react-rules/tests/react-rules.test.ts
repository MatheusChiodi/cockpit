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

test('reads react from devDependencies too, and keeps the sections beneath', async ($, on) => {
  on('session.root', () => ({ value: '/work' }))
  on('prompt.compose', () => ({ sections: [{ id: 'other', text: 'kept', scope: 'session' }] }))
  on('fs.read', () => ({ value: JSON.stringify({ devDependencies: { react: '19' } }) }))
  on('fs.exists', () => ({ value: true }))

  const composed = await $.prompt.compose(COMPOSE)
  expect(composed.sections.map(s => s.id)).toEqual(['other', 'react-rules:rules'])
  expect(composed.sections[1]?.text).toContain('# React rules')
  expect(composed.sections[1]?.scope).toBe('session')
})

test('adds nothing without a package.json', async ($, on) => {
  const files = { text: '' }
  on('session.root', () => ({ value: '/work' }))
  on('prompt.compose', () => ({ sections: [] }))
  on('fs.read', () => (files.text === '' ? { deny: 'ENOENT' } : { value: files.text }))
  on('fs.exists', () => ({ value: false }))

  expect((await $.prompt.compose(COMPOSE)).sections).toEqual([])
})

test('a package name that only contains react does not count', async ($, on) => {
  project(on, 'package.json', JSON.stringify({ dependencies: { 'react-dom': '19', preact: '10' } }))

  expect((await $.prompt.compose(COMPOSE)).sections).toEqual([])
})

test('decides once per session: a later package.json change is not read', async ($, on) => {
  const held = { text: JSON.stringify({ dependencies: { react: '19' } }) }
  on('session.root', () => ({ value: '/work' }))
  on('prompt.compose', () => ({ sections: [] }))
  on('fs.read', () => ({ value: held.text }))
  on('fs.exists', () => ({ value: true }))

  expect((await $.prompt.compose(COMPOSE)).sections).toHaveLength(1)

  held.text = '{}'
  expect((await $.prompt.compose(COMPOSE)).sections).toHaveLength(1)
})

test('adds nothing for a package.json that does not parse', async ($, on) => {
  project(on, 'package.json', '{ "dependencies": { "react": ')

  expect((await $.prompt.compose(COMPOSE)).sections).toEqual([])
})
