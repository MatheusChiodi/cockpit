import { expect, test } from 'claude-code/testing'

const COMPOSE = { model: 'claude-test', promptModel: 'claude-test', surfaces: ['terminal'], tools: [], outputStyle: null, traits: [] } as const

test('adds its section to the composed prompt', async ($, on) => {
  on('prompt.compose', () => ({ sections: [] }))

  const composed = await $.prompt.compose(COMPOSE)
  const section = composed.sections.find(s => s.id === 'security-rules:rules')
  expect(section?.text).toContain("# Security rules")
})

test('keeps the sections beneath and adds its own last', async ($, on) => {
  on('prompt.compose', () => ({
    sections: [
      { id: 'a', text: 'first', scope: 'shared' },
      { id: 'b', text: 'second', scope: 'session' },
    ],
  }))

  const composed = await $.prompt.compose(COMPOSE)
  expect(composed.sections.map(s => s.id)).toEqual(['a', 'b', 'security-rules:rules'])
  expect(composed.sections[0]?.text).toBe('first')
})

test('the section lasts the session and states each rule', async ($, on) => {
  on('prompt.compose', () => ({ sections: [] }))

  const [section] = (await $.prompt.compose(COMPOSE)).sections
  expect(section?.scope).toBe('session')

  for (const rule of ['parameterized queries', 'Keep secrets out of code', 'least privilege', 'Never disable TLS']) {
    expect(section?.text, rule).toContain(rule)
  }
})

test('adds the section once on every compose, without piling up', async ($, on) => {
  on('prompt.compose', () => ({ sections: [] }))

  await $.prompt.compose(COMPOSE)
  const second = await $.prompt.compose({ ...COMPOSE, model: 'claude-other', promptModel: 'claude-other' })
  expect(second.sections.filter(s => s.id === 'security-rules:rules')).toHaveLength(1)
})
