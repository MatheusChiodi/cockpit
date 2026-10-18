import { expect, test } from 'claude-code/testing'

const FACTS = { model: 'm', promptModel: 'm', surfaces: [], tools: [], outputStyle: null, traits: [] }

test('adds its section to every prompt', async ($, on) => {
  on('prompt.compose', () => ({ sections: [] }))

  const composed = await $.prompt.compose(FACTS)
  const section = composed.sections.find(item => item.id === 'minimal-diff:rule')

  expect(section?.scope).toBe('session')
  expect(section?.text.length).toBeGreaterThan(40)
})

test('keeps the sections composed beneath it, in order, and appends its own last', async ($, on) => {
  on('prompt.compose', () => ({
    sections: [
      { id: 'a:one', text: 'first', scope: 'session' as const },
      { id: 'b:two', text: 'second', scope: 'session' as const },
    ],
  }))

  const composed = await $.prompt.compose(FACTS)

  expect(composed.sections.map(item => item.id)).toEqual(['a:one', 'b:two', 'minimal-diff:rule'])
})

test('states the smallest-change rule and forbids drive-by refactors', async ($, on) => {
  on('prompt.compose', () => ({ sections: [] }))

  const composed = await $.prompt.compose(FACTS)
  const text = composed.sections.find(item => item.id === 'minimal-diff:rule')?.text ?? ''

  expect(text.startsWith('# Minimal diff')).toBe(true)
  expect(text).toContain('smallest change')
  expect(text).toContain('No drive-by refactors')
  expect(text).toContain('mention them instead of fixing them')
})

test('adds the section exactly once per compose, whatever the model', async ($, on) => {
  on('prompt.compose', () => ({ sections: [] }))

  for (const model of ['claude-a', 'claude-b']) {
    const composed = await $.prompt.compose({ ...FACTS, model, promptModel: model, surfaces: ['terminal'] })
    expect(composed.sections.filter(item => item.id === 'minimal-diff:rule').length).toBe(1)
  }
})
