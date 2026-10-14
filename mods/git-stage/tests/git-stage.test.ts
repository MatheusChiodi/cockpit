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
