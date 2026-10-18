import { expect, test } from 'claude-code/testing'

const COMPOSE = { model: 'claude-test', promptModel: 'claude-test', surfaces: ['terminal'], tools: [], outputStyle: null, traits: [] } as const

test('adds its section to the composed prompt', async ($, on) => {
  on('prompt.compose', () => ({ sections: [] }))

  const composed = await $.prompt.compose(COMPOSE)
  const section = composed.sections.find(s => s.id === 'branch-naming:rules')
  expect(section?.text).toContain("# Branch naming")
})

test('keeps the sections beneath and adds its own last, scoped to the session', async ($, on) => {
  on('prompt.compose', () => ({ sections: [{ id: 'a', text: 'one', scope: 'session' as const }, { id: 'b', text: 'two', scope: 'session' as const }] }))

  const composed = await $.prompt.compose(COMPOSE)
  expect(composed.sections.map(s => s.id)).toEqual(['a', 'b', 'branch-naming:rules'])
  expect(composed.sections[2]?.scope).toBe('session')
})

test('states the format, the allowed types and the default-branch rule', async ($, on) => {
  on('prompt.compose', () => ({ sections: [] }))

  const text = (await $.prompt.compose(COMPOSE)).sections[0]?.text ?? ''
  expect(text).toContain('`<type>/<short-kebab-subject>`')

  for (const type of ['feat/', 'fix/', 'chore/', 'refactor/', 'docs/']) {
    expect(text, type).toContain(`\`${type}\``)
  }

  expect(text).toContain('2 to 5 lowercase words')
  expect(text).toContain('Never commit new work straight to the default branch (main, master, develop)')
})

test('adds the section once per composed prompt', async ($, on) => {
  on('prompt.compose', () => ({ sections: [] }))

  await $.prompt.compose(COMPOSE)
  const again = await $.prompt.compose(COMPOSE)
  expect(again.sections.filter(s => s.id === 'branch-naming:rules')).toHaveLength(1)
})
