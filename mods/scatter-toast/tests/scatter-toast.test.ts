import { expect, test } from 'claude-code/testing'
import type { On } from 'claude-code'
import type { Engine } from 'claude-code/testing'

const DONE = { answer: '', durationMs: 5000, isAborted: false, turnId: 't-1', reason: 'answer' } as const
const ANSWER = { result: { stdout: '', stderr: '', interrupted: false } }

// The world beneath the mod: answers the turn, the edits and the root, and records every toast.
const world = (on: On, toasts: string[]) => {
  on('turn.start', (_$, e) => ({ turnId: e.turnId }))
  on('turn.complete', (_$, e) => ({ text: e.answer }))
  on('session.root', () => ({ value: '/project' }))
  on('tool.call', { tool: 'Write' }, () => ANSWER)
  on('ui.toast', (_$, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })
}

const write = ($: Engine, path: string) =>
  $.tool.call({ tool: 'Write', file_path: path, content: 'x', tool_use_id: path })

const turnOf = async ($: Engine, paths: string[]) => {
  await $.turn.start({ text: 'go', turnId: 't-1' })

  for (const path of paths) {
    await write($, path)
  }

  await $.turn.complete(DONE)
}

test('speaks when a turn spreads over many unrelated folders', async ($, on) => {
  const toasts: string[] = []
  world(on, toasts)

  await turnOf($, [
    '/project/src/auth/a.ts',
    '/project/src/auth/b.ts',
    '/project/src/billing/c.ts',
    '/project/docs/guide/d.md',
    '/project/scripts/e.mjs',
    '/project/tests/unit/f.ts',
    '/project/tests/unit/g.ts',
    '/project/README.md',
  ])

  expect(toasts).toEqual(['8 files across 6 unrelated folders in one turn. Worth splitting into separate changes.'])
})

test('stays quiet for many files in few folders, and for few files', async ($, on) => {
  const toasts: string[] = []
  world(on, toasts)

  await turnOf($, Array.from({ length: 12 }, (_, i) => `/project/src/auth/f${i}.ts`))
  await turnOf($, ['/project/a/x.ts', '/project/b/x.ts', '/project/c/x.ts', '/project/d/x.ts'])

  expect(toasts).toEqual([])
})

test('each turn starts counting again', async ($, on) => {
  const toasts: string[] = []
  world(on, toasts)

  await turnOf($, ['/project/a/x/1.ts', '/project/b/x/2.ts', '/project/c/x/3.ts', '/project/d/x/4.ts'])
  await turnOf($, ['/project/e/x/5.ts', '/project/f/x/6.ts', '/project/g/x/7.ts', '/project/h/x/8.ts'])

  expect(toasts).toEqual([])
})

test('speaks the language set in the hub', async ($, on) => {
  const toasts: string[] = []
  world(on, toasts)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  await turnOf($, [
    '/project/a/x/1.ts',
    '/project/a/x/2.ts',
    '/project/b/x/3.ts',
    '/project/c/x/4.ts',
    '/project/d/x/5.ts',
    '/project/e/x/6.ts',
    '/project/f/x/7.ts',
    '/project/g/x/8.ts',
  ])

  expect(toasts).toEqual(['8 arquivos em 7 pastas sem relação num só turno. Vale separar em mudanças distintas.'])
})
