import { expect, test } from 'claude-code/testing'
import type { On } from 'claude-code'
import type { Engine } from 'claude-code/testing'

const START = { cwd: '/project', surface: 'terminal', isInteractive: true } as const
const ANSWER = { result: { stdout: '', stderr: '', interrupted: false } }

// The world beneath the mod: answers the session, the prompt and the writes, and records every toast.
const world = (on: On, toasts: string[]) => {
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('prompt.submit', (_$, e) => ({ text: e.text }))
  on('tool.call', { tool: 'Write' }, () => ANSWER)
  on('ui.toast', (_$, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })
}

const prompts = async ($: Engine, count: number) => {
  for (let i = 0; i < count; i += 1) {
    await $.prompt.submit({ text: `question ${i}`, wait: false, origin: { kind: 'composer' } })
  }
}

const write = ($: Engine) => $.tool.call({ tool: 'Write', file_path: '/project/a.ts', content: 'x', tool_use_id: 'w-1' })

test('speaks on the tenth prompt without a changed file, once', async ($, on) => {
  const toasts: string[] = []
  world(on, toasts)

  await $.session.start(START)
  await prompts($, 9)
  expect(toasts).toEqual([])

  await prompts($, 1)
  expect(toasts).toEqual(['10 prompts and no file changed. What would make this done?'])

  await prompts($, 15)
  expect(toasts).toHaveLength(1)
})

test('a changed file starts the count over', async ($, on) => {
  const toasts: string[] = []
  world(on, toasts)

  await $.session.start(START)
  await prompts($, 9)
  await write($)
  await prompts($, 9)
  expect(toasts).toEqual([])

  await write($)
  await prompts($, 10)
  expect(toasts).toHaveLength(1)
})

test('speaks the language set in the hub', async ($, on) => {
  const toasts: string[] = []
  world(on, toasts)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  await $.session.start(START)
  await prompts($, 10)

  expect(toasts).toEqual(['10 prompts e nenhum arquivo alterado. O que deixaria isto pronto?'])
})

test('an Edit also starts the count over', async ($, on) => {
  const toasts: string[] = []
  world(on, toasts)
  on('tool.call', { tool: 'Edit' }, () => ANSWER)

  await $.session.start(START)
  await prompts($, 9)
  await $.tool.call({ tool: 'Edit', file_path: '/project/a.ts', old_string: 'a', new_string: 'b', tool_use_id: 'e-1' })
  await prompts($, 9)

  expect(toasts).toEqual([])
})

test('a write by a subagent does not reset the count', async ($, on) => {
  const toasts: string[] = []
  world(on, toasts)

  await $.session.start(START)
  await prompts($, 9)
  await $.tool.call({
    tool: 'Write',
    file_path: '/project/a.ts',
    content: 'x',
    tool_use_id: 'w-sub',
    agentId: 'sub-1',
  } as never)
  await prompts($, 1)

  expect(toasts).toHaveLength(1)
})

test('a new session starts the count over', async ($, on) => {
  const toasts: string[] = []
  world(on, toasts)

  await $.session.start(START)
  await prompts($, 9)
  await $.session.start(START)
  await prompts($, 9)
  expect(toasts).toEqual([])

  await prompts($, 1)
  expect(toasts).toHaveLength(1)
})

test('lets every prompt through unchanged', async ($, on) => {
  const toasts: string[] = []
  world(on, toasts)

  await $.session.start(START)
  await prompts($, 9)
  const entered = await $.prompt.submit({ text: 'tenth', wait: false, origin: { kind: 'composer' } })

  expect(entered.text).toBe('tenth')
  expect(toasts).toHaveLength(1)
})

test('speaks Spanish when the hub language is es', async ($, on) => {
  const toasts: string[] = []
  world(on, toasts)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  await $.session.start(START)
  await prompts($, 10)

  expect(toasts).toEqual(['10 prompts y ningún archivo cambiado. ¿Qué lo dejaría terminado?'])
})
