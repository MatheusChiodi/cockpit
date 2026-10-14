import { expect, test } from 'claude-code/testing'
import type { On } from 'claude-code'

const lines = (count: number) => Array.from({ length: count }, (_, at) => `line ${at}`).join('\n')

// The world beneath the mod: a Bash that answers with the lines the test chose, a Read, and the toasts.
const world = (on: On, count: number) => {
  const toasts: string[] = []
  on('tool.call', { tool: 'Bash' }, () => ({ result: { stdout: lines(count), stderr: '', interrupted: false } }))
  on('tool.call', { tool: 'Read' }, () => ({ result: undefined as never }))
  on('ui.toast', (_$, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })

  return toasts
}

test('tells Claude and the person when a result passes 300 lines', async ($, on) => {
  const toasts = world(on, 1204)

  const ran = await $.tool.call({ tool: 'Bash', command: 'npm ls --all', tool_use_id: 'b1' })

  expect(ran.context?.[0]).toContain('that result was 1204 lines')
  expect(ran.context?.[0]).toContain('narrow the next search')
  expect(toasts).toEqual(['flood-note: Bash returned 1,204 lines, Claude was told to narrow the next one'])
})

test('stays quiet for a short result and for a Read', async ($, on) => {
  const toasts = world(on, 120)

  const short = await $.tool.call({ tool: 'Bash', command: 'git status', tool_use_id: 'b2' })
  expect(short.context).toBeUndefined()

  const read = await $.tool.call({ tool: 'Read', file_path: 'src/a.ts', tool_use_id: 'r1' })
  expect(read.context).toBeUndefined()
  expect(toasts).toEqual([])
})

test('speaks the language set in the hub', async ($, on) => {
  const toasts = world(on, 500)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  await $.tool.call({ tool: 'Bash', command: 'find src', tool_use_id: 'p1' })

  expect(toasts).toEqual(['flood-note: Bash devolveu 500 linhas, Claude foi avisado para estreitar a próxima'])
})
