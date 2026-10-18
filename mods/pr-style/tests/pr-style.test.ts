import { expect, test } from 'claude-code/testing'

const COMPOSE = { model: 'claude-test', promptModel: 'claude-test', surfaces: ['terminal'], tools: [], outputStyle: null, traits: [] } as const

test('adds its section to the composed prompt', async ($, on) => {
  on('prompt.compose', () => ({ sections: [] }))

  const composed = await $.prompt.compose(COMPOSE)
  const section = composed.sections.find(s => s.id === 'pr-style:rules')
  expect(section?.text).toContain("# Pull request descriptions")
})

test('keeps the sections composed beneath ahead of its own', async ($, on) => {
  on('prompt.compose', () => ({ sections: [{ id: 'other:a', text: 'A', scope: 'session' }] }))

  const composed = await $.prompt.compose(COMPOSE)
  expect(composed.sections.map(s => s.id)).toEqual(['other:a', 'pr-style:rules'])
})

test('adds one section, scoped to the session', async ($, on) => {
  on('prompt.compose', () => ({ sections: [] }))

  const composed = await $.prompt.compose(COMPOSE)
  const ours = composed.sections.filter(s => s.id === 'pr-style:rules')
  expect(ours).toHaveLength(1)
  expect(ours[0]?.scope).toBe('session')
})

test('asks for a Conventional Commits title and the four body parts', async ($, on) => {
  on('prompt.compose', () => ({ sections: [] }))

  const text = (await $.prompt.compose(COMPOSE)).sections.find(s => s.id === 'pr-style:rules')?.text ?? ''
  expect(text).toContain('Conventional Commits')
  expect(text).toContain('under 72 characters')

  for (const part of ['What changed', 'Why', 'How it was tested', 'Risks']) {
    expect(text, part).toContain(part)
  }
})

test('adds the same section for every model and surface', async ($, on) => {
  on('prompt.compose', () => ({ sections: [] }))

  const terminal = await $.prompt.compose(COMPOSE)
  const desktop = await $.prompt.compose({ ...COMPOSE, model: 'claude-opus-5-5', surfaces: ['desktop'] })
  expect(desktop.sections).toEqual(terminal.sections)
})
