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

test('speaks Spanish when the hub says so', async ($, on) => {
  const toasts: string[] = []
  world(on, toasts, { name: 'feat/checkout' })
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  await $.session.start(START)
  await edit($, ...UNRELATED)

  expect(toasts).toEqual(['Rama feat/checkout, pero 6 archivos editados no tienen que ver con ella.'])
})

test('counts a path once whatever its case, and leaves out subagent edits', async ($, on) => {
  const toasts: string[] = []
  world(on, toasts, { name: 'feat/login-form' })

  await $.session.start(START)
  for (const path of UNRELATED.slice(0, 5)) {
    await $.tool.call({ tool: 'Write', file_path: path.toUpperCase(), content: 'x', tool_use_id: `u-${path}` })
  }
  await edit($, ...UNRELATED.slice(0, 5))
  await $.tool.call({ tool: 'Write', file_path: '/project/sub.ts', content: 'x', tool_use_id: 'sub', ...{ agentId: 'agent-1' } })
  await $.turn.complete(DONE)

  expect(toasts).toEqual([])
})

test('checks nothing at the end of an aborted or a subagent turn', async ($, on) => {
  const toasts: string[] = []
  world(on, toasts, { name: 'feat/login-form' })

  await $.session.start(START)
  for (const path of UNRELATED) {
    await $.tool.call({ tool: 'Write', file_path: path, content: 'x', tool_use_id: path })
  }
  await $.turn.complete({ ...DONE, isAborted: true, reason: 'aborted' })
  await $.turn.complete({ ...DONE, agentId: 'agent-1' })
  expect(toasts).toEqual([])

  await $.turn.complete(DONE)
  expect(toasts).toHaveLength(1)
})

test('counts Edit calls too, and tells again on another branch', async ($, on) => {
  const toasts: string[] = []
  const branch = { name: 'feat/search' }
  world(on, toasts, branch)
  on('tool.call', { tool: 'Edit' }, () => ANSWER)

  await $.session.start(START)
  for (const path of UNRELATED) {
    await $.tool.call({ tool: 'Edit', file_path: path, old_string: 'a', new_string: 'b', tool_use_id: `e-${path}` })
  }
  await $.turn.complete(DONE)
  expect(toasts).toEqual(['Branch feat/search, but 6 edited files have nothing to do with it.'])

  branch.name = 'feat/profile'
  await $.turn.complete(DONE)
  expect(toasts[1]).toBe('Branch feat/profile, but 6 edited files have nothing to do with it.')
})

test('a new session starts the count over', async ($, on) => {
  const toasts: string[] = []
  world(on, toasts, { name: 'feat/login-form' })

  await $.session.start(START)
  await edit($, ...UNRELATED.slice(0, 5))
  await $.session.start(START)
  await edit($, UNRELATED[5] ?? '')

  expect(toasts).toEqual([])
})
