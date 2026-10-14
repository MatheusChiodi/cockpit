import { expect, mock, test } from 'claude-code/testing'

const START = { cwd: '/repo', surface: null, isInteractive: true } as const

const reply = (stdout: string, exitCode = 0) => ({
  value: { exitCode, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false },
})

test('counts staged, unstaged and new files and hides on a clean tree', async ($, on) => {
  const clock = mock.clock(on)
  const statuses: (string | undefined)[] = []
  let out = 'M  a.ts\nMM b.ts\n M c.ts\n?? d.ts\n?? e.ts\n'
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('process.run', () => reply(out))
  on('ui.status', (_, e) => {
    statuses.push(e.text)

    return { value: undefined }
  })

  await $.session.start(START)
  expect(statuses.at(-1)).toBe('index 2 staged  2 unstaged  2 new')

  out = ''
  await clock.advance(30000)
  expect(statuses.at(-1)).toBeUndefined()
})

test('hides outside a repository and speaks the hub language', async ($, on) => {
  const clock = mock.clock(on)
  const statuses: (string | undefined)[] = []
  let out = reply('A  a.ts\n')
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('process.run', () => out)
  on('ui.status', (_, e) => {
    statuses.push(e.text)

    return { value: undefined }
  })
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  await $.session.start(START)
  expect(statuses.at(-1)).toBe('index 1 no stage')

  out = reply('', 128)
  await clock.advance(30000)
  expect(statuses.at(-1)).toBeUndefined()
})
