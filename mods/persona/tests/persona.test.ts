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

test('registers /persona with every option in its description', async ($, on) => {
  const registered: { name: string; description: string }[] = []
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('command.register', (_$, e) => {
    registered.push({ name: e.name, description: e.description })

    return { value: { command: e.name } }
  })

  await $.session.start({ cwd: '/project', surface: 'terminal', isInteractive: true })

  expect(registered).toEqual([
    { name: 'persona', description: "Switches Claude's persona (mentor, senior, rubberduck, pirata, yoda, zen, off)" },
  ])
})

test('each persona brings its own voice to the prompt', async ($, on) => {
  mock.store(on)
  on('prompt.compose', () => ({ sections: [] }))

  const voices: Record<string, string> = {
    mentor: 'patient mentor',
    senior: 'demanding senior dev',
    rubberduck: 'rubber duck',
    pirata: 'pirate',
    zen: 'calm and minimalism',
  }

  for (const [name, voice] of Object.entries(voices)) {
    await $.command.run(run(name))
    const { sections } = await $.prompt.compose(INPUT)
    expect(sections[0]?.text, name).toContain(voice)
    expect(sections[0]?.text.startsWith('# Persona\n'), name).toBe(true)
  }
})

test('keeps the sections beneath and ignores a stored value that is not a persona', async ($, on) => {
  mock.store(on, { persona: 'gone' })
  on('prompt.compose', () => ({ sections: [{ id: 'other:x', text: 'x', scope: 'session' as const }] }))

  expect((await $.prompt.compose(INPUT)).sections.map(section => section.id)).toEqual(['other:x'])

  await $.command.run(run('mentor'))
  expect((await $.prompt.compose(INPUT)).sections.map(section => section.id)).toEqual(['other:x', 'persona:voice'])
})

test('a new persona replaces the one before', async ($, on) => {
  mock.store(on)
  on('prompt.compose', () => ({ sections: [] }))

  await $.command.run(run('yoda'))
  await $.command.run(run('zen'))

  const { sections } = await $.prompt.compose(INPUT)
  expect(sections).toHaveLength(1)
  expect(sections[0]?.text).not.toContain('Yoda')
  expect((await $.command.run(run(''))).text).toContain('Current persona: zen')
})

test('speaks Spanish when the hub language is es', async ($, on) => {
  mock.store(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ES)

  expect((await $.command.run(run(''))).text).toContain('Persona actual: ninguna')
  expect((await $.command.run(run('zen'))).text).toBe('Persona "zen" activa desde el próximo prompt.')
  expect((await $.command.run(run('off'))).text).toBe('Persona desactivada.')
})
