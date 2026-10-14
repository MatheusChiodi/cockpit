import { expect, test } from 'claude-code/testing'
import type { On } from 'claude-code'

const START = { cwd: '/project', surface: 'terminal', isInteractive: true } as const
const TURN = { answer: '', durationMs: 1, isAborted: false, turnId: 't-1', reason: 'answer' } as const

// The world beneath the mod: answers the session and the model, and records the status line.
const world = (on: On, model: { name: string }) => {
  const status: (string | undefined)[] = []
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('turn.complete', (_$, e) => ({ text: e.answer }))
  on('session.model', () => ({ value: model.name }))
  on('ui.status', (_$, e) => {
    status.push(e.text)

    return { value: undefined }
  })

  return status
}

test('shows the model without the claude- prefix and follows a /model switch', async ($, on) => {
  const model = { name: 'claude-sonnet-5-5' }
  const status = world(on, model)

  await $.session.start(START)
  expect(status.at(-1)).toBe('model sonnet-5-5')

  model.name = 'claude-opus-5-5'
  await $.turn.complete(TURN)
  expect(status.at(-1)).toBe('model opus-5-5')
})

test('shows nothing while the hub lists it as off', async ($, on) => {
  const status = world(on, { name: 'claude-sonnet-5-5' })
  on('state.get', { plugin: 'cockpit', key: 'off' }, () => ({ value: { value: ['model-status'], version: 1 } }))

  await $.session.start(START)
  expect(status.length).toBeGreaterThan(0)
  expect(status.every(text => text === undefined)).toBe(true)
})

test('speaks the language set in the hub', async ($, on) => {
  const status = world(on, { name: 'claude-sonnet-5-5' })
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  await $.session.start(START)
  expect(status.at(-1)).toBe('modelo sonnet-5-5')
})
