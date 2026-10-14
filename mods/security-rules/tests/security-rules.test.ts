import { expect, test } from 'claude-code/testing'

const COMPOSE = { model: 'claude-test', promptModel: 'claude-test', surfaces: ['terminal'], tools: [], outputStyle: null, traits: [] } as const

test('adds its section to the composed prompt', async ($, on) => {
  on('prompt.compose', () => ({ sections: [] }))

  const composed = await $.prompt.compose(COMPOSE)
  const section = composed.sections.find(s => s.id === 'security-rules:rules')
  expect(section?.text).toContain("# Security rules")
})
