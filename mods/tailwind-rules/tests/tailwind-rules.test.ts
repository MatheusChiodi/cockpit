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
  project(on, "package.json", "{\"devDependencies\":{\"tailwindcss\":\"4\"}}")

  const composed = await $.prompt.compose(COMPOSE)
  expect(composed.sections.map(s => s.id)).toContain('tailwind-rules:rules')
})

test('adds nothing when the stack is absent', async ($, on) => {
  project(on, "package.json", "{\"dependencies\":{\"react\":\"19\"}}")

  const composed = await $.prompt.compose(COMPOSE)
  expect(composed.sections).toEqual([])
})

test('finds Tailwind in dependencies too', async ($, on) => {
  project(on, 'package.json', JSON.stringify({ dependencies: { tailwindcss: '3' } }))

  expect((await $.prompt.compose(COMPOSE)).sections.map(s => s.id)).toEqual(['tailwind-rules:rules'])
})

test('adds nothing when package.json is missing or not valid JSON', async ($, on) => {
  project(on, 'package.json', '{ "devDependencies": { "tailwindcss": ')

  expect((await $.prompt.compose(COMPOSE)).sections).toEqual([])
})

test('adds nothing when there is no package.json at all', async ($, on) => {
  on('session.root', () => ({ value: '/work' }))
  on('prompt.compose', () => ({ sections: [] }))
  on('fs.read', () => ({ deny: 'ENOENT' }))

  expect((await $.prompt.compose(COMPOSE)).sections).toEqual([])
})

test('keeps the sections beneath, adds its own last and reads package.json once', async ($, on) => {
  let reads = 0
  on('session.root', () => ({ value: '/work' }))
  on('prompt.compose', () => ({ sections: [{ id: 'other', text: 'kept', scope: 'session' as const }] }))
  on('fs.read', () => {
    reads += 1

    return { value: JSON.stringify({ devDependencies: { tailwindcss: '4' } }) }
  })

  const composed = await $.prompt.compose(COMPOSE)
  await $.prompt.compose(COMPOSE)
  expect(composed.sections.map(s => s.id)).toEqual(['other', 'tailwind-rules:rules'])
  expect((composed.sections[1] as { text: string }).text.startsWith('# Tailwind rules\n')).toBe(true)
  expect(reads).toBe(1)
})
