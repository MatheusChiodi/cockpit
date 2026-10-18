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

test('lists every allowed commit type', async ($, on) => {
  on('prompt.compose', () => ({ sections: [] }))

  const composed = await $.prompt.compose({ ...INPUT })
  const text = composed.sections.find(s => s.id === 'commit-style:rules')?.text ?? ''

  for (const type of ['feat', 'fix', 'refactor', 'perf', 'test', 'docs', 'chore', 'build', 'ci']) {
    expect(text, type).toContain(type)
  }
})

test('is a session-scoped section titled for commit messages', async ($, on) => {
  on('prompt.compose', () => ({ sections: [] }))

  const composed = await $.prompt.compose({ ...INPUT })
  const section = composed.sections.find(s => s.id === 'commit-style:rules')

  expect(section?.scope).toBe('session')
  expect(section?.text.startsWith('# Commit messages')).toBe(true)
  expect(section?.text).toContain("language already used in the repository's history")
})

test('adds its section only once on each compose', async ($, on) => {
  on('prompt.compose', () => ({ sections: [] }))

  const first = await $.prompt.compose({ ...INPUT })
  const second = await $.prompt.compose({ ...INPUT })

  expect(first.sections.filter(s => s.id === 'commit-style:rules').length).toBe(1)
  expect(second.sections.filter(s => s.id === 'commit-style:rules').length).toBe(1)
})
