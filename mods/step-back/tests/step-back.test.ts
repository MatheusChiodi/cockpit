import { expect, test } from 'claude-code/testing'
import type { On } from 'claude-code'
import type { Engine } from 'claude-code/testing'

const START = { cwd: '/project', surface: 'terminal', isInteractive: true } as const

const fails = { result: { stdout: '', stderr: 'boom', interrupted: false }, isError: true as const }
const passes = { result: { stdout: 'ok', stderr: '', interrupted: false } }

// The world beneath the mod: shell calls fail unless the command says `ok`, and every toast is recorded.
const world = (on: On, toasts: string[]) => {
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('tool.call', { tool: 'Bash' }, (_$, e) => (e.command.includes('ok') ? passes : fails))
  on('ui.toast', (_$, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })
}

let id = 0
const bash = ($: Engine, command: string) => $.tool.call({ tool: 'Bash', command, tool_use_id: `b-${(id += 1)}` })

test('speaks on the fourth failure in a row at the same thing, once', async ($, on) => {
  const toasts: string[] = []
  world(on, toasts)

  await $.session.start(START)
  await bash($, 'npm test')
  await bash($, 'npm test -- --watch=false')
  await bash($, 'cd app && npm test')
  expect(toasts).toEqual([])

  await bash($, 'npm test src')
  expect(toasts).toEqual(['4 failed attempts at "npm test". Step back and look at the cause.'])

  await bash($, 'npm test')
  await bash($, 'npm test')
  expect(toasts).toHaveLength(1)
})

test('a success or a different thing starts the count over', async ($, on) => {
  const toasts: string[] = []
  world(on, toasts)

  await $.session.start(START)
  await bash($, 'npm test')
  await bash($, 'npm test')
  await bash($, 'npm test')
  await bash($, 'npm test ok')
  await bash($, 'npm test')
  await bash($, 'npm test')
  await bash($, 'npm test')
  expect(toasts).toEqual([])

  await bash($, 'npm run build')
  await bash($, 'npm test')
  await bash($, 'npm test')
  await bash($, 'npm test')
  expect(toasts).toEqual([])

  // A new streak that does reach four speaks again.
  await bash($, 'npm test')
  expect(toasts).toHaveLength(1)
})

test('different programs are different things', async ($, on) => {
  const toasts: string[] = []
  world(on, toasts)

  await $.session.start(START)

  for (const command of ['pytest a', 'pytest b', 'pytest c', 'make', 'pytest d']) {
    await bash($, command)
  }

  expect(toasts).toEqual([])
})

test('speaks the language set in the hub', async ($, on) => {
  const toasts: string[] = []
  world(on, toasts)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  await $.session.start(START)

  for (let i = 0; i < 4; i += 1) {
    await bash($, 'cargo build')
  }

  expect(toasts).toEqual(['4 tentativas falhas de "cargo build". Dê um passo atrás e olhe a causa.'])
})

test('speaks Spanish when the hub is set to es', async ($, on) => {
  const toasts: string[] = []
  world(on, toasts)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  await $.session.start(START)

  for (let i = 0; i < 4; i += 1) {
    await bash($, 'go test ./...')
  }

  expect(toasts).toEqual(['4 intentos fallidos de "go test". Da un paso atrás y mira la causa.'])
})

test('counts PowerShell failures too, and folds the case of runner commands', async ($, on) => {
  const toasts: string[] = []
  world(on, toasts)
  on('tool.call', { tool: 'PowerShell' }, () => fails)

  await $.session.start(START)

  for (const command of ['NPM Test', 'npm TEST', 'npm test', 'Npm test']) {
    await $.tool.call({ tool: 'PowerShell', command, tool_use_id: `p-${(id += 1)}` })
  }

  expect(toasts).toEqual(['4 failed attempts at "npm test". Step back and look at the cause.'])
})

test('a refused call is not a failure', async ($, on) => {
  const toasts: string[] = []
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('tool.call', { tool: 'Bash' }, (_$, e) => (e.command.includes('deny') ? { deny: 'no' } : fails))
  on('ui.toast', (_$, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })

  await $.session.start(START)
  await bash($, 'tsc')
  await bash($, 'tsc')
  await bash($, 'tsc')
  await bash($, 'tsc deny')
  expect(toasts).toEqual([])

  await bash($, 'tsc')
  expect(toasts).toHaveLength(1)
})

test('a success at another thing does not break the streak', async ($, on) => {
  const toasts: string[] = []
  world(on, toasts)

  await $.session.start(START)
  await bash($, 'tsc')
  await bash($, 'tsc')
  await bash($, 'tsc')
  await bash($, 'git status ok')
  await bash($, 'tsc')

  expect(toasts).toEqual(['4 failed attempts at "tsc". Step back and look at the cause.'])
})

test('a new session starts the count over', async ($, on) => {
  const toasts: string[] = []
  world(on, toasts)

  await $.session.start(START)
  await bash($, 'tsc')
  await bash($, 'tsc')
  await bash($, 'tsc')
  await $.session.start(START)
  await bash($, 'tsc')

  expect(toasts).toEqual([])
})
