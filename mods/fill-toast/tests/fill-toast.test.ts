import { expect, test } from 'claude-code/testing'
import type { On } from 'claude-code'

const measure = (percent: number) => ({
  context: { window: 200000, percent },
  rateLimits: [],
  changed: ['context' as const],
})

// The world beneath the mod: the measurement, a Bash that answers, and the toasts.
const world = (on: On) => {
  const toasts: string[] = []
  on('session.measure', (_$, e) => ({ changed: e.changed }))
  on('tool.call', { tool: 'Bash' }, () => ({ result: { stdout: '', stderr: '', interrupted: false } }))
  on('ui.toast', (_$, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })

  return toasts
}

test('toasts a jump of 10 points or more and names the last tool', async ($, on) => {
  const toasts = world(on)

  await $.session.measure(measure(40))
  await $.tool.call({ tool: 'Bash', command: 'npm test', tool_use_id: 'b1' })
  await $.session.measure(measure(55))

  expect(toasts).toEqual(['Context +15 points in one step (55%). Last tool: Bash'])
})

test('stays quiet for small steps, the first reading and a drop after compaction', async ($, on) => {
  const toasts = world(on)

  await $.session.measure(measure(60))
  await $.session.measure(measure(66))
  await $.session.measure(measure(12))
  await $.session.measure(measure(18))

  expect(toasts).toEqual([])
})

test('speaks the language set in the hub', async ($, on) => {
  const toasts = world(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  await $.session.measure(measure(10))
  await $.session.measure(measure(30))

  expect(toasts).toEqual(['Contexto +20 pontos de uma vez (30%). Última ferramenta: nenhuma'])
})
