import { expect, mock, test } from 'claude-code/testing'

const START = { cwd: '/repo', surface: null, isInteractive: true } as const

const MIN = 60000

const reply = (count: number) => ({
  value: { exitCode: 0, stdout: `${count}\n`, stderr: '', isStdoutTruncated: false, isStderrTruncated: false },
})

test('reminds once an hour while the branch stays 3 or more commits ahead', async ($, on) => {
  const clock = mock.clock(on)
  const toasts: string[] = []
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('process.run', () => reply(4))
  on('ui.toast', (_, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })

  await $.session.start(START)
  await clock.advance(50 * MIN)
  expect(toasts).toEqual([])

  await clock.advance(10 * MIN)
  expect(toasts).toEqual(['4 commits not pushed for over an hour'])

  await clock.advance(50 * MIN)
  expect(toasts).toHaveLength(1)

  await clock.advance(10 * MIN)
  expect(toasts).toHaveLength(2)
})

test('a push (fewer commits ahead) restarts the hour', async ($, on) => {
  const clock = mock.clock(on)
  const toasts: string[] = []
  let count = 5
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('process.run', () => reply(count))
  on('ui.toast', (_, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })

  await $.session.start(START)
  await clock.advance(40 * MIN)
  count = 0
  await clock.advance(10 * MIN)
  count = 5
  await clock.advance(50 * MIN)
  expect(toasts).toEqual([])
})

test('stays silent without an upstream, and speaks the hub language', async ($, on) => {
  const clock = mock.clock(on)
  const toasts: string[] = []
  let isBroken = true
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('process.run', () =>
    isBroken
      ? { value: { exitCode: 128, stdout: '', stderr: 'no upstream', isStdoutTruncated: false, isStderrTruncated: false } }
      : reply(3),
  )
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))
  on('ui.toast', (_, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })

  await $.session.start(START)
  await clock.advance(90 * MIN)
  expect(toasts).toEqual([])

  isBroken = false
  await clock.advance(70 * MIN)
  expect(toasts).toEqual(['3 commits sem push há mais de uma hora'])
})

test('stays silent while the branch is fewer than 3 commits ahead', async ($, on) => {
  const clock = mock.clock(on)
  const toasts: string[] = []
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('process.run', () => reply(2))
  on('ui.toast', (_, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })

  await $.session.start(START)
  await clock.advance(180 * MIN)
  expect(toasts).toEqual([])
})

test('asks git how many commits lead the upstream', async ($, on) => {
  const clock = mock.clock(on)
  const argvs: string[][] = []
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('process.run', (_, e) => {
    argvs.push([...e.argv])

    return reply(0)
  })

  await $.session.start(START)
  await clock.advance(20 * MIN)

  expect(argvs.length).toBe(3)
  expect(argvs[0]).toEqual(['git', 'rev-list', '--count', '@{u}..HEAD'])
})

test('treats unreadable output as nothing ahead', async ($, on) => {
  const clock = mock.clock(on)
  const toasts: string[] = []
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('process.run', () => ({
    value: { exitCode: 0, stdout: 'garbage\n', stderr: '', isStdoutTruncated: false, isStderrTruncated: false },
  }))
  on('ui.toast', (_, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })

  await $.session.start(START)
  await clock.advance(120 * MIN)
  expect(toasts).toEqual([])
})

test('a new session starts the hour again', async ($, on) => {
  const clock = mock.clock(on)
  const toasts: string[] = []
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('process.run', () => reply(3))
  on('ui.toast', (_, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })

  await $.session.start(START)
  await clock.advance(50 * MIN)
  await $.session.start(START)
  await clock.advance(10 * MIN)
  expect(toasts).toEqual([])
})

test('speaks Spanish when the hub language is es', async ($, on) => {
  const clock = mock.clock(on)
  const toasts: string[] = []
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('process.run', () => reply(7))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))
  on('ui.toast', (_, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })

  await $.session.start(START)
  await clock.advance(60 * MIN)
  expect(toasts).toEqual(['7 commits sin push desde hace más de una hora'])
})
