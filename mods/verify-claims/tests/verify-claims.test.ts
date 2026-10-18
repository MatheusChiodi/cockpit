import { expect, test } from 'claude-code/testing'

const FACTS = { model: 'm', promptModel: 'm', surfaces: [], tools: [], outputStyle: null, traits: [] }

test('adds its section to every prompt', async ($, on) => {
  on('prompt.compose', () => ({ sections: [] }))

  const composed = await $.prompt.compose(FACTS)
  const section = composed.sections.find(item => item.id === 'verify-claims:rule')

  expect(section?.scope).toBe('session')
  expect(section?.text.length).toBeGreaterThan(40)
})

test('keeps the sections beneath it and adds its own last', async ($, on) => {
  on('prompt.compose', () => ({ sections: [{ id: 'base', text: 'kept', scope: 'session' as const }] }))

  const composed = await $.prompt.compose(FACTS)
  expect(composed.sections.map(item => item.id)).toEqual(['base', 'verify-claims:rule'])
  expect(composed.sections[0]?.text).toBe('kept')
})

test('says to run before claiming and to report what was verified', async ($, on) => {
  on('prompt.compose', () => ({ sections: [] }))

  const section = (await $.prompt.compose(FACTS)).sections.find(item => item.id === 'verify-claims:rule')
  expect(section?.text).toBe(
    ['# Verification', 'Do not say something works without running it.', 'End with what you verified and what you did not.'].join('\n'),
  )
})

test('adds the section once per compose, every time', async ($, on) => {
  on('prompt.compose', () => ({ sections: [] }))

  for (let i = 0; i < 3; i += 1) {
    const ids = (await $.prompt.compose(FACTS)).sections.map(item => item.id)
    expect(ids).toEqual(['verify-claims:rule'])
  }
})

test('stays in English whatever the hub language', async ($, on) => {
  on('prompt.compose', () => ({ sections: [] }))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  const section = (await $.prompt.compose(FACTS)).sections.find(item => item.id === 'verify-claims:rule')
  expect(section?.text).toContain('Do not say something works without running it.')
})
