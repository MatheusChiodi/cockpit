import { expect, test } from 'claude-code/testing'
import type { On } from 'claude-code'

const ANSWER = { result: undefined as never }

// The world beneath the mod: a file system whose mtime the test moves, and a Read that answers.
const world = (on: On, mtime: { value: number }) => {
  on('fs.stat', () => ({ value: { kind: 'file' as const, size: 1000, mtimeMs: mtime.value, isLink: false } }))
  on('tool.call', { tool: 'Read' }, () => ANSWER)
}

test('refuses a second read of an unchanged file once, then lets the repeat through', async ($, on) => {
  world(on, { value: 100 })

  const first = await $.tool.call({ tool: 'Read', file_path: 'src/a.ts', tool_use_id: 'r1' })
  expect(first.deny).toBeUndefined()

  const second = await $.tool.call({ tool: 'Read', file_path: 'src/a.ts', tool_use_id: 'r2' })
  expect(second.deny).toContain('src/a.ts is unchanged and already in the context')

  const third = await $.tool.call({ tool: 'Read', file_path: 'src/a.ts', tool_use_id: 'r3' })
  expect(third.deny).toBeUndefined()
})

test('lets a changed file and another range through', async ($, on) => {
  const mtime = { value: 100 }
  world(on, mtime)

  await $.tool.call({ tool: 'Read', file_path: 'src/a.ts', tool_use_id: 'c1' })

  const slice = await $.tool.call({ tool: 'Read', file_path: 'src/a.ts', offset: 50, limit: 40, tool_use_id: 'c2' })
  expect(slice.deny).toBeUndefined()

  mtime.value = 200
  const changed = await $.tool.call({ tool: 'Read', file_path: 'src/a.ts', tool_use_id: 'c3' })
  expect(changed.deny).toBeUndefined()
})

test('forgets what it saw after a compaction', async ($, on) => {
  world(on, { value: 100 })
  on('session.compact', () => ({ messages: [{ role: 'user' as const, text: 'summary', toolUses: [] }] }))

  await $.tool.call({ tool: 'Read', file_path: 'src/a.ts', tool_use_id: 'k1' })
  await $.session.compact({ trigger: 'manual', messages: [{ role: 'user' as const, text: 'summary', toolUses: [] }] })

  const again = await $.tool.call({ tool: 'Read', file_path: 'src/a.ts', tool_use_id: 'k2' })
  expect(again.deny).toBeUndefined()
})

test('speaks the language set in the hub', async ($, on) => {
  world(on, { value: 100 })
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  await $.tool.call({ tool: 'Read', file_path: 'src/a.ts', tool_use_id: 'p1' })
  const again = await $.tool.call({ tool: 'Read', file_path: 'src/a.ts', tool_use_id: 'p2' })

  expect(again.deny).toContain('src/a.ts não mudou e já está no contexto')
})
