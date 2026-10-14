import { expect, mock, test } from 'claude-code/testing'

const run = (args: string) => ({
  command: 'concise',
  args,
  origin: { kind: 'composer' } as const,
  presentation: { isFullscreen: true, columns: 120 },
})

const INPUT = {
  model: 'claude-test',
  promptModel: 'claude-test',
  surfaces: ['terminal'],
  tools: [],
  outputStyle: null,
  traits: [],
} as const

const PT = { value: { value: 'pt', version: 1 } } as const

test('toggles on and off, adds the style section and shows the status entry', async ($, on) => {
  mock.store(on)
  const statuses: (string | undefined)[] = []
  on('ui.status', ($, e) => {
    statuses.push(e.text)

    return { value: undefined }
  })
  on('prompt.compose', () => ({ sections: [] }))

  expect((await $.prompt.compose(INPUT)).sections).toHaveLength(0)

  const turnedOn = await $.command.run(run(''))
  expect(turnedOn.text).toContain('Concise mode on')
  expect((await $.prompt.compose(INPUT)).sections.map(section => section.id)).toEqual(['concise-mode:style'])

  const turnedOff = await $.command.run(run(''))
  expect(turnedOff.text).toContain('Concise mode off')
  expect((await $.prompt.compose(INPUT)).sections).toHaveLength(0)
  expect(statuses).toEqual(['concise', undefined])
})

test('on and off are explicit and idempotent', async ($, on) => {
  mock.store(on)
  on('ui.status', () => ({ value: undefined }))
  on('prompt.compose', () => ({ sections: [] }))

  await $.command.run(run('on'))
  const again = await $.command.run(run('ON'))
  expect(again.text).toContain('Concise mode on')
  expect((await $.prompt.compose(INPUT)).sections).toHaveLength(1)

  await $.command.run(run('off'))
  expect((await $.prompt.compose(INPUT)).sections).toHaveLength(0)
})

test('speaks the language set in the hub', async ($, on) => {
  mock.store(on)
  on('ui.status', () => ({ value: undefined }))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => PT)

  const answer = await $.command.run(run('on'))
  expect(answer.text).toContain('Modo conciso ligado')
})
