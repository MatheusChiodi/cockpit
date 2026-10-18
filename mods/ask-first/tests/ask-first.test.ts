import { expect, test } from 'claude-code/testing'

const FACTS = { model: 'm', promptModel: 'm', surfaces: [], tools: [], outputStyle: null, traits: [] }

test('adds its section to every prompt', async ($, on) => {
  on('prompt.compose', () => ({ sections: [] }))

  const composed = await $.prompt.compose(FACTS)
  const section = composed.sections.find(item => item.id === 'ask-first:rule')

  expect(section?.scope).toBe('session')
  expect(section?.text.length).toBeGreaterThan(40)
})

test('adds its section after the ones composed beneath', async ($, on) => {
  on('prompt.compose', () => ({ sections: [{ id: 'base', text: 'base', scope: 'session' as const }] }))

  const composed = await $.prompt.compose(FACTS)
  expect(composed.sections.map(item => item.id)).toEqual(['base', 'ask-first:rule'])
})

test('tells the model to ask one short question only when readings diverge', async ($, on) => {
  on('prompt.compose', () => ({ sections: [] }))

  const text = (await $.prompt.compose(FACTS)).sections[0]?.text ?? ''
  expect(text.startsWith('# Ambiguity\n')).toBe(true)
  expect(text).toContain('ask one short question before acting')
  expect(text).toContain('Otherwise proceed without asking.')
})

test('adds it once on every compose', async ($, on) => {
  on('prompt.compose', () => ({ sections: [] }))

  for (let round = 0; round < 3; round += 1) {
    const composed = await $.prompt.compose(FACTS)
    expect(composed.sections.filter(item => item.id === 'ask-first:rule')).toHaveLength(1)
  }
})
