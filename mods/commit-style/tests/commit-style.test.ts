import { expect, test } from 'claude-code/testing'

const INPUT = {
  model: 'claude-test',
  promptModel: 'claude-test',
  surfaces: ['terminal'],
  tools: [],
  outputStyle: null,
  traits: [],
} as const

test('adds the commit message rules to the system prompt', async ($, on) => {
  on('prompt.compose', () => ({ sections: [] }))

  const composed = await $.prompt.compose({ ...INPUT })
  const section = composed.sections.find(s => s.id === 'commit-style:rules')

  expect(section?.text).toContain('Conventional Commits')
  expect(section?.text).toContain('at most 72 characters')
})

test('keeps the sections that are already there', async ($, on) => {
  on('prompt.compose', () => ({ sections: [{ id: 'other:rules', text: 'be brief', scope: 'session' as const }] }))

  const composed = await $.prompt.compose({ ...INPUT })

  expect(composed.sections.map(s => s.id)).toEqual(['other:rules', 'commit-style:rules'])
})
