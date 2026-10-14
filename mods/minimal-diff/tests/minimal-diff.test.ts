import { expect, test } from 'claude-code/testing'

const FACTS = { model: 'm', promptModel: 'm', surfaces: [], tools: [], outputStyle: null, traits: [] }

test('adds its section to every prompt', async ($, on) => {
  on('prompt.compose', () => ({ sections: [] }))

  const composed = await $.prompt.compose(FACTS)
  const section = composed.sections.find(item => item.id === 'minimal-diff:rule')

  expect(section?.scope).toBe('session')
  expect(section?.text.length).toBeGreaterThan(40)
})
