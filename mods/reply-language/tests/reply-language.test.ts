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

test('adds the English and Spanish instructions for en and es', async ($, on) => {
  let lang = 'en'
  on('prompt.compose', () => ({ sections: [] }))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: lang, version: 1 } }))

  const en = await $.prompt.compose(COMPOSE)
  expect(en.sections[0]?.text.split('\n')[1]).toBe('Always answer in English.')

  lang = 'es'
  const es = await $.prompt.compose(COMPOSE)
  expect(es.sections[0]?.text.split('\n')[1]).toBe('Always answer in neutral Spanish, with correct accents and opening ¿ and ¡.')
})

test('appends one session section after the ones beneath', async ($, on) => {
  on('prompt.compose', () => ({ sections: [{ id: 'other', text: 'kept', scope: 'session' as const }] }))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  const composed = await $.prompt.compose(COMPOSE)
  expect(composed.sections.map(section => section.id)).toEqual(['other', 'reply-language:language'])
  expect(composed.sections[1]).toEqual({
    id: 'reply-language:language',
    text: [
      '# Language',
      'Always answer in Brazilian Portuguese, with correct accents.',
      'Technical terms, API names, commands and code identifiers stay in the original.',
      'Commit messages and code comments follow the language already used in the repository.',
    ].join('\n'),
    scope: 'session',
  })
})

test('follows the hub when the language changes between prompts', async ($, on) => {
  let lang: string | undefined
  on('prompt.compose', () => ({ sections: [] }))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: lang === undefined ? {} : { value: lang, version: 1 } }) as never)

  expect((await $.prompt.compose(COMPOSE)).sections).toEqual([])
  lang = 'es'
  expect((await $.prompt.compose(COMPOSE)).sections[0]?.text).toContain('neutral Spanish')
  lang = 'pt'
  expect((await $.prompt.compose(COMPOSE)).sections[0]?.text).toContain('Brazilian Portuguese')
})

test('falls back to English for a language it does not know', async ($, on) => {
  on('prompt.compose', () => ({ sections: [] }))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'fr', version: 1 } }) as never)

  const text = (await $.prompt.compose(COMPOSE)).sections[0]?.text ?? ''
  expect(text.split('\n')[1]).toBe('Always answer in English.')
  expect(text).not.toContain('undefined')
})
