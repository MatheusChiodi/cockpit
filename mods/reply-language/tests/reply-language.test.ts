import { expect, test } from 'claude-code/testing'

// What the engine passes when it renders a system prompt.
const COMPOSE = {
  model: 'claude-test',
  promptModel: 'claude-test',
  surfaces: ['terminal'],
  tools: [],
  outputStyle: null,
  traits: [],
} as const

test('adds the Portuguese instruction when the hub language is pt', async ($, on) => {
  on('prompt.compose', () => ({ sections: [] }))
  // Stands in for the hub: answers the language it would hold.
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  const composed = await $.prompt.compose(COMPOSE)
  const text = composed.sections.map(section => section.text).join('\n')
  expect(text).toContain('Brazilian Portuguese')
  expect(text).toContain('code identifiers')
})

test('adds nothing when the language was never set', async ($, on) => {
  on('prompt.compose', () => ({ sections: [] }))

  const composed = await $.prompt.compose(COMPOSE)
  expect(composed.sections).toEqual([])
})
