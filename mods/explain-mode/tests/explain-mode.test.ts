import { expect, mock, test } from 'claude-code/testing'

const run = (args: string) => ({
  command: 'explain',
  args,
  origin: { kind: 'composer' } as const,
  presentation: { isFullscreen: false, columns: 100 },
})

const FACTS = { model: 'm', promptModel: 'm', surfaces: [], tools: [], outputStyle: null, traits: [] }

test('adds the section only while on', async ($, on) => {
  mock.store(on)
  on('ui.status', () => ({ value: undefined }))
  on('prompt.compose', () => ({ sections: [] }))
  const ids = async () => (await $.prompt.compose(FACTS)).sections.map(section => section.id)

  expect(await ids()).not.toContain('explain-mode:rule')

  const turnedOn = await $.command.run(run('on'))
  expect(turnedOn.text).toContain('on')
  expect(await ids()).toContain('explain-mode:rule')

  await $.command.run(run('off'))
  expect(await ids()).not.toContain('explain-mode:rule')
})

test('toggles with no argument', async ($, on) => {
  mock.store(on)
  on('ui.status', () => ({ value: undefined }))
  on('prompt.compose', () => ({ sections: [] }))
  const ids = async () => (await $.prompt.compose(FACTS)).sections.map(section => section.id)

  await $.command.run(run(''))
  expect(await ids()).toContain('explain-mode:rule')

  await $.command.run(run(''))
  expect(await ids()).not.toContain('explain-mode:rule')
})

test('answers in the hub language', async ($, on) => {
  mock.store(on)
  on('ui.status', () => ({ value: undefined }))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  const answer = await $.command.run(run('on'))
  expect(answer.text).toContain('ligado')
})
