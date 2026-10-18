import { expect, test } from 'claude-code/testing'

const FACTS = { model: 'm', promptModel: 'm', surfaces: [], tools: [], outputStyle: null, traits: [] }

test('adds its section to every prompt', async ($, on) => {
  on('prompt.compose', () => ({ sections: [] }))

  const composed = await $.prompt.compose(FACTS)
  const section = composed.sections.find(item => item.id === 'no-comments:rule')

  expect(section?.scope).toBe('session')
  expect(section?.text.length).toBeGreaterThan(40)
})

test('keeps the sections composed beneath and adds its own last', async ($, on) => {
  on('prompt.compose', () => ({
    sections: [
      { id: 'a', text: 'first', scope: 'session' as const },
      { id: 'b', text: 'second', scope: 'session' as const },
    ],
  }))

  const composed = await $.prompt.compose(FACTS)
  expect(composed.sections.map(item => item.id)).toEqual(['a', 'b', 'no-comments:rule'])
})

test('adds the section once per composition, every time', async ($, on) => {
  on('prompt.compose', () => ({ sections: [] }))

  for (let round = 0; round < 3; round += 1) {
    const composed = await $.prompt.compose(FACTS)
    expect(composed.sections.filter(item => item.id === 'no-comments:rule')).toHaveLength(1)
  }
})

test('tells the model the rule in English', async ($, on) => {
  on('prompt.compose', () => ({ sections: [] }))

  const text = (await $.prompt.compose(FACTS)).sections[0]?.text ?? ''
  expect(text.startsWith('# Comments\n')).toBe(true)
  expect(text).toContain('No commented-out code.')
  expect(text).toContain('Keep a comment only when it explains why.')
})
