import { expect, test } from 'claude-code/testing'

// Stands in for the person at the AskUserQuestion dialog that $.ui.ask opens.
const answer = (on: any, label: () => string) =>
  on('tool.call', { tool: 'AskUserQuestion' }, (_: unknown, e: any) => ({
    result: { questions: e.questions, answers: { [e.questions[0].question]: label() } },
  }))

const run = (args: string) => ({
  command: 'stage',
  args,
  origin: { kind: 'composer' } as const,
  presentation: { isFullscreen: true, columns: 120 },
})

const done = (exitCode: number, stdout = '', stderr = '') => ({
  value: { exitCode, stdout, stderr, isStdoutTruncated: false, isStderrTruncated: false },
})

test('groups staged, unstaged and new files', async ($, on) => {
  on('process.run', () => done(0, 'M  a.ts\n M b.ts\nMM c.ts\n?? d.ts\n'))

  const text = (await $.command.run(run(''))).text
  expect(text).toBe(
    ['Staged (2)', '  M a.ts', '  M c.ts', 'Unstaged (2)', '  M b.ts', '  M c.ts', 'New (1)', '  d.ts'].join('\n'),
  )
})

test('says when the tree is clean', async ($, on) => {
  on('process.run', () => done(0, ''))

  expect((await $.command.run(run(''))).text).toContain('working tree is clean')
})

test('stages the named paths only after the person says yes', async ($, on) => {
  const calls: string[] = []
  on('process.run', (_, e) => {
    calls.push(e.argv.slice(2).join(' '))

    return done(0)
  })
  let label = 'no'
  answer(on, () => label)

  expect((await $.command.run(run('a.ts b.ts'))).text).toBe('Cancelled.')
  expect(calls).toEqual([])

  label = 'yes'
  expect((await $.command.run(run('a.ts b.ts'))).text).toBe('Staged 2 path(s).')
  expect(calls).toEqual(['add -- a.ts b.ts'])
})

test('unstages with -r', async ($, on) => {
  const calls: string[] = []
  on('process.run', (_, e) => {
    calls.push(e.argv.slice(2).join(' '))

    return done(0)
  })
  answer(on, () => 'yes')

  expect((await $.command.run(run('-r a.ts'))).text).toBe('Unstaged 1 path(s).')
  expect(calls).toEqual(['restore --staged -- a.ts'])
})

test('speaks the language set in the hub', async ($, on) => {
  on('process.run', () => done(0, ''))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  expect((await $.command.run(run(''))).text).toContain('árvore de trabalho está limpa')
})

test('says it is not a repository when git status fails or git is missing', async ($, on) => {
  let fails = true
  on('process.run', () => {
    if (fails) {
      return done(128, '', 'fatal: not a git repository')
    }

    throw new Error('spawn git ENOENT')
  })

  expect((await $.command.run(run(''))).text).toBe('Not a git repository (or git is not available).')
  fails = false
  expect((await $.command.run(run('  '))).text).toBe('Not a git repository (or git is not available).')
})

test('reports the first line of git failing to stage', async ($, on) => {
  on('process.run', () => done(128, '', "fatal: pathspec 'x.ts' did not match any files\nmore"))
  answer(on, () => 'yes')

  expect((await $.command.run(run('x.ts'))).text).toBe("git failed: fatal: pathspec 'x.ts' did not match any files")
})

test('cancels when the question cannot be asked', async ($, on) => {
  const calls: string[] = []
  on('process.run', (_, e) => {
    calls.push(e.argv.join(' '))

    return done(0)
  })
  on('tool.call', { tool: 'AskUserQuestion' }, () => ({ deny: 'no dialog here' }))

  expect((await $.command.run(run('a.ts'))).text).toBe('Cancelled.')
  expect(calls).toEqual([])
})

test('asks with the count and the paths named', async ($, on) => {
  const asked: string[] = []
  on('process.run', () => done(0))
  on('tool.call', { tool: 'AskUserQuestion' }, (_: unknown, e: any) => {
    asked.push(e.questions[0].question)

    return { result: { questions: e.questions, answers: { [e.questions[0].question]: 'yes' } } }
  })

  await $.command.run(run('-r  a.ts   b.ts'))
  expect(asked).toEqual(['Unstage 2 path(s)? a.ts b.ts'])
})

test('a lone -r shows the overview', async ($, on) => {
  on('process.run', () => done(0, 'A  new.ts\n'))

  expect((await $.command.run(run('-r'))).text).toBe(['Staged (1)', '  A new.ts'].join('\n'))
})

test('stages in Portuguese and Spanish with the localized yes', async ($, on) => {
  let lang = 'pt'
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: lang, version: 1 } }))
  on('process.run', () => done(0, '?? n.ts\n'))
  answer(on, () => (lang === 'pt' ? 'sim' : 'sí'))

  expect((await $.command.run(run('a.ts'))).text).toBe('1 caminho(s) no stage.')
  lang = 'es'
  expect((await $.command.run(run('-r a.ts'))).text).toBe('1 ruta(s) fuera del stage.')
  expect((await $.command.run(run(''))).text).toBe(['Nuevos (1)', '  n.ts'].join('\n'))
})
