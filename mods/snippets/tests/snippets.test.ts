import { expect, mock, test } from 'claude-code/testing'

const run = (args: string) => ({
  command: 'snip',
  args,
  origin: { kind: 'composer' } as const,
  presentation: { isFullscreen: true, columns: 120 },
})

test('saves, lists, uses and removes a snippet', async ($, on) => {
  mock.store(on)
  const filled: string[] = []
  on('prompt.fill', (_, e) => {
    filled.push(e.text)

    return { isFilled: true }
  })

  expect((await $.command.run(run('save review Review this diff\nfor bugs'))).text).toBe('Snippet "review" saved.')
  expect((await $.command.run(run('save short Be brief'))).text).toBe('Snippet "short" saved.')
  expect((await $.command.run(run('save short Be very brief'))).text).toBe('Snippet "short" updated.')

  const list = await $.command.run(run('list'))
  expect(list.text).toBe('review  Review this diff for bugs\nshort   Be very brief')

  expect((await $.command.run(run('review'))).text).toBe('Snippet "review" is in the prompt box.')
  expect(filled).toEqual(['Review this diff\nfor bugs'])

  expect((await $.command.run(run('rm review'))).text).toBe('Snippet "review" removed.')
  expect((await $.command.run(run('review'))).text).toContain('No snippet named "review"')
  expect((await $.command.run(run('rm review'))).text).toContain('No snippet named "review"')
})

test('refuses bad names and empty text, and starts empty', async ($, on) => {
  mock.store(on)
  on('ui.selection', () => ({ value: undefined }))

  expect((await $.command.run(run(''))).text).toContain('No snippets yet')
  expect((await $.command.run(run('save list text'))).text).toContain('cannot be save, list or rm')
  expect((await $.command.run(run('save bad/name text'))).text).toContain('Names use letters')
  expect((await $.command.run(run('save only'))).text).toContain('Nothing to save in "only"')
  expect((await $.command.run(run('save'))).text).toContain('Usage: /snip')
})

test('saves the mouse selection when no text follows the name', async ($, on) => {
  mock.store(on)
  on('ui.selection', () => ({ value: { text: '  selected words  ' } }))
  on('prompt.fill', () => ({ isFilled: false }))

  await $.command.run(run('save picked'))
  expect((await $.command.run(run('list'))).text).toBe('picked  selected words')
  expect((await $.command.run(run('picked'))).text).toContain('could not take the snippet')
})

test('speaks the language set in the hub', async ($, on) => {
  mock.store(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  expect((await $.command.run(run('save a texto'))).text).toBe('Trecho "a" salvo.')
})

test('rm without a name prints the usage', async ($, on) => {
  mock.store(on)

  expect((await $.command.run(run('rm'))).text).toContain('Usage: /snip')
})

test('the list cuts long texts at 70 characters on one line', async ($, on) => {
  mock.store(on)
  const long = 'word '.repeat(30).trim()

  await $.command.run(run(`save long ${long}`))
  const list = (await $.command.run(run('list'))).text ?? ''
  expect(list).toBe(`long  ${long.slice(0, 70)}`)
})

test('a name over 40 characters is refused', async ($, on) => {
  mock.store(on)

  expect((await $.command.run(run(`save ${'a'.repeat(41)} text`))).text).toContain('Names use letters')
  expect((await $.command.run(run(`save ${'a'.repeat(40)} text`))).text).toBe(`Snippet "${'a'.repeat(40)}" saved.`)
})

test('a broken store value counts as no snippets', async ($, on) => {
  on('store.get', () => ({ value: 'garbage' as never }))

  expect((await $.command.run(run('list'))).text).toContain('No snippets yet')
})

test('a failing selection means nothing to save', async ($, on) => {
  mock.store(on)
  on('ui.selection', () => {
    throw new Error('unsupported')
  })

  expect((await $.command.run(run('save x'))).text).toContain('Nothing to save in "x"')
})

test('registers /snip and speaks Spanish', async ($, on) => {
  mock.store(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  const hints: string[] = []
  on('command.register', (_$, e) => {
    hints.push(`${e.name} ${e.argumentHint}`)

    return { value: { command: e.name } }
  })

  await $.session.start({ cwd: '/p', surface: 'terminal', isInteractive: true })
  expect(hints).toEqual(['snip save <nombre> <texto> | <nombre> | list | rm <nombre>'])
  expect((await $.command.run(run('save a texto'))).text).toBe('Fragmento "a" guardado.')
  expect((await $.command.run(run('rm a'))).text).toBe('Fragmento "a" borrado.')
  expect((await $.command.run(run('a'))).text).toContain('No hay un fragmento llamado "a"')
})
