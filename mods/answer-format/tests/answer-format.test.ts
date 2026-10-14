import { expect, mock, test } from 'claude-code/testing'

const COMPOSE = { model: 'claude-test', promptModel: 'claude-test', surfaces: ['terminal'], tools: [], outputStyle: null, traits: [] } as const

const run = (args: string) => ({
  command: 'format',
  args,
  origin: { kind: 'composer' } as const,
  presentation: { isFullscreen: true, columns: 120 },
})

test('keeps the chosen shape and asks for it in a section', async ($, on) => {
  mock.store(on)
  on('prompt.compose', () => ({ sections: [] }))

  const none = await $.prompt.compose(COMPOSE)
  expect(none.sections).toEqual([])

  const set = await $.command.run(run('table'))
  expect(set.text).toContain('table')

  const composed = await $.prompt.compose(COMPOSE)
  expect(composed.sections.find(s => s.id === 'answer-format:shape')?.text).toContain('Markdown table')

  await $.command.run(run('off'))
  expect((await $.prompt.compose(COMPOSE)).sections).toEqual([])
})

test('rejects an unknown shape', async ($, on) => {
  mock.store(on)

  const answer = await $.command.run(run('poem'))
  expect(answer.text).toContain('Unknown format: poem')
})

test('speaks the language set in the hub', async ($, on) => {
  mock.store(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  const answer = await $.command.run(run('steps'))
  expect(answer.text).toContain('Formato das respostas definido como steps')
})
