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
