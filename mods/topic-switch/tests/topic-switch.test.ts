import { expect, test } from 'claude-code/testing'
import type { On } from 'claude-code'
import type { Engine } from 'claude-code/testing'

const START = { cwd: '/project', surface: 'terminal', isInteractive: true } as const
const ANSWER = { result: { stdout: '', stderr: '', interrupted: false } }

// The world beneath the mod: answers the session, the prompt and the tools, and records every toast.
const world = (on: On, toasts: string[]) => {
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('prompt.submit', (_$, e) => ({ text: e.text }))
  on('tool.call', { tool: 'Write' }, () => ANSWER)
  on('tool.call', { tool: 'Bash' }, () => ANSWER)
  on('ui.toast', (_$, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })
}

const say = ($: Engine, text: string) => $.prompt.submit({ text, wait: false, origin: { kind: 'composer' } })

const write = async ($: Engine, ...paths: string[]) => {
  for (const path of paths) {
    await $.tool.call({ tool: 'Write', file_path: path, content: 'x', tool_use_id: path })
  }
}

const LOGIN = ['/project/src/auth/login.ts', '/project/src/auth/redirect.ts', '/project/src/auth/session.ts']
const INVOICE = 'now rename the invoice export columns for finance'

test('speaks when an unrelated prompt arrives with files in flight, once', async ($, on) => {
  const toasts: string[] = []
  world(on, toasts)

  await $.session.start(START)
  await say($, 'fix the login redirect after logout')
  await write($, ...LOGIN)
  await say($, INVOICE)
  expect(toasts).toEqual(['New subject with 3 files in flight. Park it, or commit first?'])

  // The subject is part of the work now.
  await say($, 'the invoice export needs finance columns again')
  expect(toasts).toHaveLength(1)
})

test('stays quiet for a follow-up, a short prompt, or too few files', async ($, on) => {
  const toasts: string[] = []
  world(on, toasts)

  await $.session.start(START)
  await say($, 'fix the login redirect after logout')
  await write($, ...LOGIN.slice(0, 2))
  await say($, INVOICE)
  expect(toasts).toEqual([])

  await write($, '/project/src/auth/token.ts')
  await say($, 'also handle the redirect when the token expires')
  await say($, 'ok go on')
  await say($, 'thanks, perfect')
  expect(toasts).toEqual([])
})

test('a commit closes the work, so the next subject is free', async ($, on) => {
  const toasts: string[] = []
  world(on, toasts)

  await $.session.start(START)
  await say($, 'fix the login redirect after logout')
  await write($, ...LOGIN)
  await $.tool.call({ tool: 'Bash', command: 'git commit -am "fix login redirect"', tool_use_id: 'c-1' })
  await say($, INVOICE)

  expect(toasts).toEqual([])
})

test('speaks the language set in the hub', async ($, on) => {
  const toasts: string[] = []
  world(on, toasts)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  await $.session.start(START)
  await say($, 'corrigir o redirecionamento do login')
  await write($, ...LOGIN)
  await say($, 'renomear as colunas da exportação de faturas')

  expect(toasts).toEqual(['Assunto novo com 3 arquivos em andamento. Deixar para depois ou commitar antes?'])
})
