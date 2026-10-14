import { expect, mock, test } from 'claude-code/testing'

const PT = { value: { value: 'pt', version: 1 } } as const
const ES = { value: { value: 'es', version: 1 } } as const

const run = (args: string) => ({
  command: 'persona',
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

test('picks a persona and adds its section to the prompt', async ($, on) => {
  mock.store(on)
  on('prompt.compose', () => ({ sections: [] }))

  expect((await $.prompt.compose(INPUT)).sections).toHaveLength(0)

  const picked = await $.command.run(run(' Yoda '))
  expect(picked.text).toContain('Persona "yoda" active from the next prompt')

  const { sections } = await $.prompt.compose(INPUT)
  expect(sections).toHaveLength(1)
  expect(sections[0]?.id).toBe('persona:voice')
  expect(sections[0]?.text).toContain('Master Yoda')

  const current = await $.command.run(run(''))
  expect(current.text).toContain('Current persona: yoda')
})

test('off removes the section, and an unknown name changes nothing', async ($, on) => {
  mock.store(on)
  on('prompt.compose', () => ({ sections: [] }))

  const none = await $.command.run(run(''))
  expect(none.text).toContain('Current persona: none')

  await $.command.run(run('zen'))
  const unknown = await $.command.run(run('nope'))
  expect(unknown.text).toContain('Unknown persona: nope. Options: mentor, senior')
  expect((await $.prompt.compose(INPUT)).sections).toHaveLength(1)

  const off = await $.command.run(run('off'))
  expect(off.text).toBe('Persona turned off.')
  expect((await $.prompt.compose(INPUT)).sections).toHaveLength(0)
})

test('speaks the language set in the hub', async ($, on) => {
  mock.store(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => PT)

  const picked = await $.command.run(run('senior'))
  expect(picked.text).toContain('Persona "senior" ativa a partir do próximo prompt')
  expect((await $.command.run(run('x'))).text).toContain('Persona desconhecida: x')
})
