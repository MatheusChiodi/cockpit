import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'
import type { Engine } from 'claude-code/testing'

const START = { cwd: '/project', surface: 'terminal', isInteractive: true } as const
const MINUTE = 60000
const ANSWER = { result: { stdout: '', stderr: '', interrupted: false } }

// The world beneath the mod: edits succeed, and every toast is recorded.
const world = (on: On, toasts: string[]) => {
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('tool.call', { tool: 'Edit' }, () => ANSWER)
  on('ui.toast', (_$, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })
}

let id = 0
const edit = ($: Engine, path: string) =>
  $.tool.call({ tool: 'Edit', file_path: path, old_string: 'a', new_string: 'b', tool_use_id: `e-${(id += 1)}` })

test('speaks on the sixth edit to one file within half an hour, once', async ($, on) => {
  const clock = mock.clock(on)
  const toasts: string[] = []
  world(on, toasts)

  await $.session.start(START)

  for (let i = 0; i < 5; i += 1) {
    await edit($, '/project/src/auth.ts')
    await clock.advance(3 * MINUTE)
  }

  expect(toasts).toEqual([])

  await edit($, '/project/src/auth.ts')
  expect(toasts).toEqual(['auth.ts edited 6 times in 30 min. Step back and look at the whole?'])

  await edit($, '/project/src/auth.ts')
  expect(toasts).toHaveLength(1)
})

test('stays quiet when the edits are spread over files or over time', async ($, on) => {
  const clock = mock.clock(on)
  const toasts: string[] = []
  world(on, toasts)

  await $.session.start(START)

  for (let i = 0; i < 12; i += 1) {
    await edit($, `/project/src/f${i % 6}.ts`)
  }

  // One file, but each edit ten minutes after the last: never six inside half an hour.
  for (let i = 0; i < 8; i += 1) {
    await edit($, '/project/src/slow.ts')
    await clock.advance(10 * MINUTE)
  }

  expect(toasts).toEqual([])
})

test('speaks the language set in the hub', async ($, on) => {
  mock.clock(on)
  const toasts: string[] = []
  world(on, toasts)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  await $.session.start(START)

  for (let i = 0; i < 6; i += 1) {
    await edit($, String.raw`D:\work\Form.tsx`)
  }

  expect(toasts).toEqual(['Form.tsx editado 6 vezes em 30 min. Dê um passo atrás e olhe o conjunto?'])
})

test('does not count edits made by a subagent', async ($, on) => {
  mock.clock(on)
  const toasts: string[] = []
  world(on, toasts)

  await $.session.start(START)

  for (let i = 0; i < 8; i += 1) {
    await $.tool.call({
      tool: 'Edit',
      file_path: '/project/src/sub.ts',
      old_string: 'a',
      new_string: 'b',
      tool_use_id: `s-${i}`,
      agentId: 'sub-1',
    } as never)
  }

  expect(toasts).toEqual([])
})

test('does not count an edit that was denied', async ($, on) => {
  mock.clock(on)
  const toasts: string[] = []
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('tool.call', { tool: 'Edit' }, () => ({ deny: 'not allowed' }))
  on('ui.toast', (_$, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })

  await $.session.start(START)

  for (let i = 0; i < 8; i += 1) {
    await edit($, '/project/src/denied.ts')
  }

  expect(toasts).toEqual([])
})

test('speaks again after six more edits once it has spoken', async ($, on) => {
  mock.clock(on)
  const toasts: string[] = []
  world(on, toasts)

  await $.session.start(START)

  for (let i = 0; i < 12; i += 1) {
    await edit($, '/project/src/loop.ts')
  }

  expect(toasts).toHaveLength(2)
})

test('a new session forgets the earlier edits', async ($, on) => {
  mock.clock(on)
  const toasts: string[] = []
  world(on, toasts)

  await $.session.start(START)

  for (let i = 0; i < 5; i += 1) {
    await edit($, '/project/src/reset.ts')
  }

  await $.session.start(START)
  await edit($, '/project/src/reset.ts')

  expect(toasts).toEqual([])
})

test('speaks Spanish when the hub language is es', async ($, on) => {
  mock.clock(on)
  const toasts: string[] = []
  world(on, toasts)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  await $.session.start(START)

  for (let i = 0; i < 6; i += 1) {
    await edit($, '/project/lib/db.py')
  }

  expect(toasts).toEqual(['db.py editado 6 veces en 30 min. ¿Un paso atrás para mirar el conjunto?'])
})
