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
  project(on, "package.json", "{\"dependencies\":{\"vue\":\"3\"}}")

  const composed = await $.prompt.compose(COMPOSE)
  expect(composed.sections.map(s => s.id)).toContain('a11y-rules:rules')
})

test('adds nothing when the stack is absent', async ($, on) => {
  project(on, "package.json", "{\"dependencies\":{\"express\":\"4\"}}")

  const composed = await $.prompt.compose(COMPOSE)
  expect(composed.sections).toEqual([])
})

test('an index.html alone turns it on', async ($, on) => {
  project(on, 'index.html', '<!doctype html>')

  expect((await $.prompt.compose(COMPOSE)).sections.map(s => s.id)).toEqual(['a11y-rules:rules'])
})

test('a web framework in devDependencies or an html script turns it on', async ($, on) => {
  project(on, 'package.json', JSON.stringify({ devDependencies: { svelte: '5' } }))

  expect((await $.prompt.compose(COMPOSE)).sections.map(s => s.id)).toContain('a11y-rules:rules')
})

test('a manifest that serves an html file turns it on', async ($, on) => {
  project(on, 'package.json', JSON.stringify({ scripts: { start: 'serve page.html' } }))

  expect((await $.prompt.compose(COMPOSE)).sections.map(s => s.id)).toContain('a11y-rules:rules')
})

test('an invalid package.json with no html adds nothing', async ($, on) => {
  project(on, 'package.json', '{ broken')

  expect((await $.prompt.compose(COMPOSE)).sections).toEqual([])
})

test('keeps the sections beneath and the rules are scoped to the session', async ($, on) => {
  on('session.root', () => ({ value: '/work' }))
  on('prompt.compose', () => ({ sections: [{ id: 'other', text: 'kept', scope: 'session' as const }] }))
  on('fs.read', () => ({ value: JSON.stringify({ dependencies: { react: '19' } }) }))
  on('fs.exists', () => ({ value: false }))

  const sections = (await $.prompt.compose(COMPOSE)).sections
  expect(sections.map(s => s.id)).toEqual(['other', 'a11y-rules:rules'])
  expect(sections[1]?.scope).toBe('session')
  expect(sections[1]?.text).toContain('# Accessibility rules')
})

test('detects the stack once per module load', async ($, on) => {
  let reads = 0
  on('session.root', () => ({ value: '/work' }))
  on('prompt.compose', () => ({ sections: [] }))
  on('fs.read', () => {
    reads += 1

    return { value: JSON.stringify({ dependencies: { vue: '3' } }) }
  })
  on('fs.exists', () => ({ value: false }))

  await $.prompt.compose(COMPOSE)
  const after = reads
  await $.prompt.compose(COMPOSE)
  expect(reads).toBe(after)
})
