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
