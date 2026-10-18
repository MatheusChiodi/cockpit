import { expect, test } from 'claude-code/testing'

// Stands in for the person at the AskUserQuestion dialog that $.ui.ask opens.
const answer = (on: any, label: string) =>
  on('tool.call', { tool: 'AskUserQuestion' }, (_: unknown, e: any) => ({
    result: { questions: e.questions, answers: { [e.questions[0].question]: label } },
  }))


const run = (args: string) => ({
  command: 'gst',
  args,
  origin: { kind: 'composer' } as const,
  presentation: { isFullscreen: true, columns: 120 },
})

const done = (exitCode: number, stdout = '', stderr = '') => ({
  value: { exitCode, stdout, stderr, isStdoutTruncated: false, isStderrTruncated: false },
})

test('saves the working tree with the message', async ($, on) => {
  const calls: string[] = []
  on('process.run', (_, e) => {
    calls.push(e.argv.slice(2).join(' '))

    return done(0, 'Saved working directory')
  })

  const answer = await $.command.run(run('save wip login form'))
  expect(answer.text).toBe('Stashed: wip login form')
  expect(calls).toEqual(['stash push -m wip login form'])
})

test('says when there was nothing to stash', async ($, on) => {
  on('process.run', () => done(0, 'No local changes to save'))

  const answer = await $.command.run(run('save wip'))
  expect(answer.text).toBe('Nothing to stash.')
})

test('lists the stashes, and says when there are none', async ($, on) => {
  let out = 'stash@{0}: On main: wip\n'
  on('process.run', () => done(0, out))

  expect((await $.command.run(run(''))).text).toBe('stash@{0}: On main: wip')
  out = ''
  expect((await $.command.run(run('list'))).text).toBe('No stashes.')
})

test('pops only after the person says yes', async ($, on) => {
  const calls: string[] = []
  on('process.run', (_, e) => {
    calls.push(e.argv.slice(2).join(' '))

    return done(0, 'stash@{0}: On main: wip')
  })
  answer(on, 'no')

  expect((await $.command.run(run('pop'))).text).toBe('Cancelled.')
  expect(calls).toEqual(['stash list'])
})

test('pops when confirmed', async ($, on) => {
  const calls: string[] = []
  on('process.run', (_, e) => {
    calls.push(e.argv.slice(2).join(' '))

    return done(0, 'stash@{0}: On main: wip')
  })
  answer(on, 'yes')

  expect((await $.command.run(run('pop'))).text).toBe('Stash popped.')
  expect(calls).toEqual(['stash list', 'stash pop'])
})

test('shows the usage for anything else', async ($, on) => {
  on('process.run', () => done(0))

  expect((await $.command.run(run('save'))).text).toContain('Usage: /gst')
  expect((await $.command.run(run('drop'))).text).toContain('Usage: /gst')
})

test('pop says when there are no stashes or no repository, without asking', async ($, on) => {
  let ran = done(0, '')
  on('process.run', () => ran)
  let asked = 0
  on('tool.call', { tool: 'AskUserQuestion' }, () => {
    asked += 1

    return { result: undefined as never }
  })

  expect((await $.command.run(run('pop'))).text).toBe('No stashes.')
  ran = done(128, '', 'fatal: not a git repository')
  expect((await $.command.run(run('pop'))).text).toBe('git not found or not a repository.')
  expect(asked).toBe(0)
})

test('reports the first line of what git said when pop fails', async ($, on) => {
  on('process.run', (_, e) =>
    e.argv.includes('list') ? done(0, 'stash@{0}: On main: wip') : done(1, '', 'error: conflict in a.ts\nhint: resolve it'),
  )
  answer(on, 'yes')

  expect((await $.command.run(run('pop'))).text).toBe('git refused: error: conflict in a.ts')
})

test('save reports a refusal, and says git is missing when it cannot start', async ($, on) => {
  let fail = true
  on('process.run', () => {
    if (fail) {
      return done(1, '', 'fatal: bad revision\nmore')
    }

    throw new Error('spawn git ENOENT')
  })

  expect((await $.command.run(run('save wip'))).text).toBe('git refused: fatal: bad revision')
  fail = false
  expect((await $.command.run(run('save wip'))).text).toBe('git not found or not a repository.')
})

test('cancels a pop when the question cannot be asked', async ($, on) => {
  on('process.run', () => done(0, 'stash@{0}: On main: wip'))
  on('tool.call', { tool: 'AskUserQuestion' }, () => ({ deny: 'not interactive' }))

  expect((await $.command.run(run('pop'))).text).toBe('Cancelled.')
})

test('speaks Portuguese: confirms with "sim" and answers in Portuguese', async ($, on) => {
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))
  let question = ''
  on('tool.call', { tool: 'AskUserQuestion' }, (_: unknown, e: any) => {
    question = e.questions[0].question

    return { result: { questions: e.questions, answers: { [e.questions[0].question]: 'sim' } } }
  })
  on('process.run', (_, e) => (e.argv.includes('push') ? done(0, 'No local changes to save') : done(0, 'stash@{0}: On main: wip')))

  expect((await $.command.run(run('pop'))).text).toBe('Stash aplicado.')
  expect(question).toBe('Aplicar o último stash (stash@{0}: On main: wip) na árvore de trabalho?')
  expect((await $.command.run(run('save x'))).text).toBe('Nada para guardar.')
  expect((await $.command.run(run('drop'))).text).toBe('Uso: /gst [save <mensagem> | pop | list]')
})

test('speaks Spanish when the hub says so', async ($, on) => {
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))
  let out = ''
  on('process.run', () => done(0, out))
  answer(on, 'no')

  expect((await $.command.run(run('list'))).text).toBe('No hay stashes.')
  out = 'stash@{0}: On main: wip'
  expect((await $.command.run(run('pop'))).text).toBe('Cancelado.')
  out = 'Saved'
  expect((await $.command.run(run('save hola'))).text).toBe('Guardado: hola')
})
