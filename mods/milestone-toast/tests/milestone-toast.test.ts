import { expect, test } from 'claude-code/testing'

const START = { cwd: '/repo', surface: null, isInteractive: true } as const

const submit = { text: 'go', wait: false, origin: { kind: 'composer' } } as const

test('toasts at 10, 25, 50 and 100 prompts and at no other count', async ($, on) => {
  const toasts: string[] = []
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('prompt.submit', (_, e) => ({ text: e.text }))
  on('ui.toast', (_, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })

  await $.session.start(START)

  for (let count = 1; count <= 100; count += 1) {
    await $.prompt.submit(submit)
  }

  expect(toasts).toEqual([
    '10 prompts in this session',
    '25 prompts in this session',
    '50 prompts in this session',
    '100 prompts in this session',
  ])
})

test('a new session starts the count over, and speaks the hub language', async ($, on) => {
  const toasts: string[] = []
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('prompt.submit', (_, e) => ({ text: e.text }))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))
  on('ui.toast', (_, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })

  await $.session.start(START)

  for (let count = 1; count <= 9; count += 1) {
    await $.prompt.submit(submit)
  }

  await $.session.start(START)

  for (let count = 1; count <= 10; count += 1) {
    await $.prompt.submit(submit)
  }

  expect(toasts).toEqual(['10 prompts en esta sesión'])
})
