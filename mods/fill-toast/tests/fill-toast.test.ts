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

test('a subagent tool call does not count as the last tool', async ($, on) => {
  const toasts = world(on)
  on('tool.call', { tool: 'Read' }, () => ({ result: undefined as never }))

  await $.session.measure(measure(20))
  await $.tool.call({ tool: 'Read', file_path: '/a.ts', tool_use_id: 'r1' })
  await $.tool.call({ tool: 'Bash', command: 'ls', tool_use_id: 'b1', agentId: 'sub' } as never)
  await $.session.measure(measure(35))

  expect(toasts).toEqual(['Context +15 points in one step (35%). Last tool: Read'])
})

test('ignores measurements that are not about the context or carry no percent', async ($, on) => {
  const toasts = world(on)

  await $.session.measure(measure(10))
  await $.session.measure({ context: { window: 200000, percent: 50 }, rateLimits: [], changed: ['cost' as const] })
  await $.session.measure({ context: { window: 200000 }, rateLimits: [], changed: ['context' as const] })
  await $.session.measure(measure(19))

  expect(toasts).toEqual([])
})

test('rounds the points and the percent', async ($, on) => {
  const toasts = world(on)

  await $.session.measure(measure(20.4))
  await $.session.measure(measure(32.6))

  expect(toasts).toEqual(['Context +12 points in one step (33%). Last tool: none'])
})

test('speaks Spanish when the hub says so', async ($, on) => {
  const toasts = world(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  await $.session.measure(measure(5))
  await $.tool.call({ tool: 'Bash', command: 'cat big.log', tool_use_id: 'b1' })
  await $.session.measure(measure(25))

  expect(toasts).toEqual(['Contexto +20 puntos de golpe (25%). Última herramienta: Bash'])
})
