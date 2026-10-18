import { expect, test } from 'claude-code/testing'
import type { On } from 'claude-code'

// The world beneath the mod: the turn, a Glob and a Bash that answer, and the toasts.
const world = (on: On) => {
  const toasts: string[] = []
  on('turn.start', (_$, e) => ({ turnId: e.turnId }))
  on('tool.call', { tool: 'Glob' }, () => ({ result: undefined as never }))
  on('tool.call', { tool: 'Bash' }, () => ({ result: { stdout: '', stderr: '', interrupted: false } }))
  on('ui.toast', (_$, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })

  return toasts
}

const glob = (id: string) => ({ tool: 'Glob', pattern: '**/*.ts', tool_use_id: id }) as const

test('nudges once, on the 15th read or search of a turn, and tells Claude', async ($, on) => {
  const toasts = world(on)
  await $.turn.start({ text: 'find the bug', turnId: 't-1' })

  for (let at = 1; at < 15; at += 1) {
    const ran = await $.tool.call(glob(`g${at}`))
    expect(ran.context).toBeUndefined()
  }

  const fifteenth = await $.tool.call(glob('g15'))
  expect(fifteenth.context?.[0]).toContain('delegate the rest of the exploring to an Explore subagent')
  expect(toasts).toEqual(['15 reads and searches this turn: a subagent could explore this cheaper'])

  const sixteenth = await $.tool.call(glob('g16'))
  expect(sixteenth.context).toBeUndefined()
  expect(toasts).toHaveLength(1)
})

test('counts again from zero on the next turn and ignores other tools', async ($, on) => {
  const toasts = world(on)
  await $.turn.start({ text: 'one', turnId: 't-1' })

  for (let at = 0; at < 14; at += 1) {
    await $.tool.call(glob(`a${at}`))
    await $.tool.call({ tool: 'Bash', command: 'ls', tool_use_id: `b${at}` })
  }

  await $.turn.start({ text: 'two', turnId: 't-2' })
  await $.tool.call(glob('c1'))

  expect(toasts).toEqual([])
})

test('speaks the language set in the hub', async ($, on) => {
  const toasts = world(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))
  await $.turn.start({ text: 'go', turnId: 't-1' })

  for (let at = 1; at <= 15; at += 1) {
    await $.tool.call(glob(`p${at}`))
  }

  expect(toasts[0]).toBe('15 leituras e buscas neste turno: um subagente exploraria isso por menos')
})

test('speaks Spanish when the hub is set to es', async ($, on) => {
  const toasts = world(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))
  await $.turn.start({ text: 'go', turnId: 't-1' })

  for (let at = 1; at <= 15; at += 1) {
    await $.tool.call(glob(`s${at}`))
  }

  expect(toasts).toEqual(['15 lecturas y búsquedas en este turno: un subagente exploraría esto por menos'])
})

test('Read, Grep and Glob all count, and the context beneath is kept', async ($, on) => {
  const toasts: string[] = []
  on('turn.start', (_$, e) => ({ turnId: e.turnId }))
  on('tool.call', { tool: 'Read' }, () => ({ result: undefined as never }))
  on('tool.call', { tool: 'Grep' }, () => ({ result: undefined as never, context: ['from below'] }))
  on('tool.call', { tool: 'Glob' }, () => ({ result: undefined as never }))
  on('ui.toast', (_$, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })
  await $.turn.start({ text: 'go', turnId: 't-1' })

  for (let at = 0; at < 7; at += 1) {
    await $.tool.call({ tool: 'Read', file_path: `/a${at}.ts`, tool_use_id: `r${at}` })
    await $.tool.call(glob(`g${at}`))
  }

  const fifteenth = await $.tool.call({ tool: 'Grep', pattern: 'x', tool_use_id: 'grep' })
  expect(fifteenth.context).toEqual(['from below', expect.stringContaining('explore-nudge: 15 reads and searches')])
  expect(toasts).toHaveLength(1)
})

test('subagent and denied calls are not counted', async ($, on) => {
  const toasts: string[] = []
  const answer = { deny: false }
  on('turn.start', (_$, e) => ({ turnId: e.turnId }))
  on('tool.call', { tool: 'Glob' }, () => (answer.deny ? { deny: 'refused' } : { result: undefined as never }))
  on('ui.toast', (_$, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })
  await $.turn.start({ text: 'go', turnId: 't-1' })

  for (let at = 0; at < 20; at += 1) {
    await $.tool.call({ ...glob(`sub${at}`), agentId: 'explorer' } as never)
  }

  answer.deny = true
  for (let at = 0; at < 20; at += 1) {
    await $.tool.call(glob(`d${at}`))
  }

  answer.deny = false
  for (let at = 0; at < 14; at += 1) {
    await $.tool.call(glob(`m${at}`))
  }

  expect(toasts).toEqual([])
  expect((await $.tool.call(glob('m15'))).context?.[0]).toContain('explore-nudge:')
})
