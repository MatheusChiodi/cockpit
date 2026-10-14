import { expect, test } from 'claude-code/testing'
import type { On } from 'claude-code'

// The world beneath the mod: a Grep that records the limit it got and answers with `lines` lines; the toasts.
const world = (on: On, lines: number) => {
  const seen: (number | undefined)[] = []
  const toasts: string[] = []
  on('tool.call', { tool: 'Grep' }, (_$, e) => {
    seen.push(e.head_limit)

    return { result: { numFiles: 1, filenames: [], numLines: lines } }
  })
  on('ui.toast', (_$, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })

  return { seen, toasts }
}

test('adds a head_limit of 100 to a content Grep and tells Claude when it cut', async ($, on) => {
  const { seen, toasts } = world(on, 100)

  const ran = await $.tool.call({ tool: 'Grep', pattern: 'useState', output_mode: 'content', tool_use_id: 'g1' })

  expect(seen).toEqual([100])
  expect(ran.context?.[0]).toContain('capped this Grep at 100 lines')
  expect(toasts).toEqual(['grep-limit: Grep cut at 100 lines, Claude was told to narrow it'])
})

test('stays silent when the answer was shorter than the cap', async ($, on) => {
  const { seen, toasts } = world(on, 12)

  const ran = await $.tool.call({ tool: 'Grep', pattern: 'rare', output_mode: 'content', tool_use_id: 'g2' })

  expect(seen).toEqual([100])
  expect(ran.context).toBeUndefined()
  expect(toasts).toEqual([])
})

test('leaves a Grep with its own limit or another mode alone', async ($, on) => {
  const { seen } = world(on, 5)

  await $.tool.call({ tool: 'Grep', pattern: 'a', output_mode: 'content', head_limit: 0, tool_use_id: 'g3' })
  await $.tool.call({ tool: 'Grep', pattern: 'a', tool_use_id: 'g4' })
  await $.tool.call({ tool: 'Grep', pattern: 'a', output_mode: 'files_with_matches', tool_use_id: 'g5' })

  expect(seen).toEqual([0, undefined, undefined])
})

test('speaks the language set in the hub', async ($, on) => {
  const { toasts } = world(on, 100)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  await $.tool.call({ tool: 'Grep', pattern: 'x', output_mode: 'content', tool_use_id: 'g6' })

  expect(toasts[0]).toBe('grep-limit: Grep cortado em 100 linhas, Claude foi avisado para estreitar a busca')
})
