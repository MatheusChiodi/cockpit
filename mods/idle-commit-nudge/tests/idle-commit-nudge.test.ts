import { expect, mock, test } from 'claude-code/testing'

const START = { cwd: '/repo', surface: null, isInteractive: true } as const

const MIN = 60000

const status = (stdout: string) => ({
  value: { exitCode: 0, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false },
})

test('nudges once per idle stretch when the tree is dirty', async ($, on) => {
  const clock = mock.clock(on)
  const toasts: string[] = []
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('prompt.submit', (_, e) => ({ text: e.text }))
  on('process.run', () => status(' M a.ts\n?? b.ts\n'))
  on('ui.toast', (_, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })

  await $.session.start(START)
  await clock.advance(9 * MIN)
  expect(toasts).toEqual([])

  await clock.advance(2 * MIN)
  expect(toasts).toEqual(['Idle for 10 min with 2 uncommitted files'])

  await clock.advance(30 * MIN)
  expect(toasts).toHaveLength(1)

  await $.prompt.submit({ text: 'back', wait: false, origin: { kind: 'composer' } })
  await clock.advance(11 * MIN)
  expect(toasts).toHaveLength(2)
})

test('stays quiet when the tree is clean, and activity resets the wait', async ($, on) => {
  const clock = mock.clock(on)
  const toasts: string[] = []
  let out = ''
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('prompt.submit', (_, e) => ({ text: e.text }))
  on('process.run', () => status(out))
  on('ui.toast', (_, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })

  await $.session.start(START)
  await clock.advance(11 * MIN)
  expect(toasts).toEqual([])

  out = ' M a.ts\n'
  await $.prompt.submit({ text: 'again', wait: false, origin: { kind: 'composer' } })
  await clock.advance(9 * MIN)
  expect(toasts).toEqual([])
})

test('speaks the language set in the hub', async ($, on) => {
  const clock = mock.clock(on)
  const toasts: string[] = []
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('process.run', () => status(' M a.ts\n'))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))
  on('ui.toast', (_, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })

  await $.session.start(START)
  await clock.advance(11 * MIN)
  expect(toasts).toEqual(['Parado há 10 min com 1 arquivo sem commit'])
})
