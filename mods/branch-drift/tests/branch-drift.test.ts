import { expect, test } from 'claude-code/testing'
import type { On } from 'claude-code'
import type { Engine } from 'claude-code/testing'

const START = { cwd: '/project', surface: 'terminal', isInteractive: true } as const
const DONE = { answer: '', durationMs: 5000, isAborted: false, turnId: 't-1', reason: 'answer' } as const
const ANSWER = { result: { stdout: '', stderr: '', interrupted: false } }

// The world beneath the mod: the branch is `branch.name`, edits succeed, and every toast is recorded.
const world = (on: On, toasts: string[], branch: { name: string }) => {
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('turn.complete', (_$, e) => ({ text: e.answer }))
  on('tool.call', { tool: 'Write' }, () => ANSWER)
  on('process.run', () => ({
    value: { exitCode: 0, stdout: `${branch.name}\n`, stderr: '', isStdoutTruncated: false, isStderrTruncated: false },
  }))
  on('ui.toast', (_$, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })
}

const edit = async ($: Engine, ...paths: string[]) => {
  for (const path of paths) {
    await $.tool.call({ tool: 'Write', file_path: path, content: 'x', tool_use_id: path })
  }

  await $.turn.complete(DONE)
}

const UNRELATED = ['a.ts', 'b.ts', 'c.ts', 'd.ts', 'e.ts', 'f.ts'].map(name => `/project/src/billing/${name}`)

test('speaks once when six files have nothing to do with the branch', async ($, on) => {
  const toasts: string[] = []
  world(on, toasts, { name: 'feat/login-form' })

  await $.session.start(START)
  await edit($, ...UNRELATED.slice(0, 5))
  expect(toasts).toEqual([])

  await edit($, UNRELATED[5] ?? '')
  expect(toasts).toEqual(['Branch feat/login-form, but 6 edited files have nothing to do with it.'])

  await edit($, '/project/src/billing/g.ts')
  expect(toasts).toHaveLength(1)
})

test('stays quiet when one edited path matches a word of the branch', async ($, on) => {
  const toasts: string[] = []
  world(on, toasts, { name: 'fix/LOGIN-142-redirect' })

  await $.session.start(START)
  await edit($, ...UNRELATED, '/project/src/auth/Login.tsx')

  expect(toasts).toEqual([])
})

test('stays quiet on main, with no branch, or with only a kind in the name', async ($, on) => {
  const toasts: string[] = []
  const branch = { name: 'main' }
  world(on, toasts, branch)

  await $.session.start(START)
  await edit($, ...UNRELATED)

  branch.name = ''
  await edit($, '/project/x1.ts')

  branch.name = 'chore/123'
  await edit($, '/project/x2.ts')

  expect(toasts).toEqual([])
})

test('speaks the language set in the hub', async ($, on) => {
  const toasts: string[] = []
  world(on, toasts, { name: 'feat/checkout' })
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  await $.session.start(START)
  await edit($, ...UNRELATED)

  expect(toasts).toEqual(['Branch feat/checkout, mas 6 arquivos editados não têm a ver com ela.'])
})
