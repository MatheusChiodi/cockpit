import { expect, test } from 'claude-code/testing'
import type { On } from 'claude-code'

// The world beneath the mod: a Bash that records the command it got, and the toasts.
const world = (on: On) => {
  const commands: string[] = []
  const toasts: string[] = []
  on('tool.call', { tool: 'Bash' }, (_$, e) => {
    commands.push(e.command)

    return { result: { stdout: '', stderr: '', interrupted: false } }
  })
  on('ui.toast', (_$, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })

  return { commands, toasts }
}

test('adds -n 30 to a git log without a limit and tells Claude', async ($, on) => {
  const { commands, toasts } = world(on)

  const ran = await $.tool.call({ tool: 'Bash', command: 'git log --stat', tool_use_id: 'b1' })

  expect(commands).toEqual(['git log -n 30 --stat'])
  expect(ran.context?.[0]).toContain('capped this git log at 30 commits')
  expect(toasts).toEqual(['git-log-limit: git log limited to 30 commits'])
})

test('leaves bounded, piped and other git commands alone', async ($, on) => {
  const { commands, toasts } = world(on)
  const sent = [
    'git log -n 5',
    'git log -5 --oneline',
    'git log --max-count=10',
    'git log --oneline | head',
    'git status',
    'git show HEAD',
  ]

  for (const [at, command] of sent.entries()) {
    await $.tool.call({ tool: 'Bash', command, tool_use_id: `k${at}` })
  }

  expect(commands).toEqual(sent)
  expect(toasts).toEqual([])
})

test('speaks the language set in the hub', async ($, on) => {
  const { toasts } = world(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  await $.tool.call({ tool: 'Bash', command: 'git log', tool_use_id: 'p1' })

  expect(toasts[0]).toBe('git-log-limit: git log limitado a 30 commits')
})

test('adds no note and no toast when the capped log fails or is denied', async ($, on) => {
  const toasts: string[] = []
  let answer: object = { deny: 'blocked' }
  on('tool.call', { tool: 'Bash' }, () => answer as never)
  on('ui.toast', (_$, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })

  expect((await $.tool.call({ tool: 'Bash', command: 'git log', tool_use_id: 'd1' })).deny).toBe('blocked')
  answer = { result: { stdout: '', stderr: 'fatal', interrupted: false }, isError: true }
  expect((await $.tool.call({ tool: 'Bash', command: 'git log', tool_use_id: 'd2' })).context).toBeUndefined()
  expect(toasts).toEqual([])
})

test('keeps the context a hook beneath already added', async ($, on) => {
  on('tool.call', { tool: 'Bash' }, () => ({ result: { stdout: '', stderr: '', interrupted: false }, context: ['from below'] }))
  on('ui.toast', () => ({ value: undefined }))

  const ran = await $.tool.call({ tool: 'Bash', command: 'git log', tool_use_id: 'c1' })
  expect(ran.context?.[0]).toBe('from below')
  expect(ran.context?.[1]).toContain('git-log-limit capped this git log at 30 commits')
})

test('caps a git log with leading spaces, -n5 and redirects count as bounded', async ($, on) => {
  const { commands } = world(on)

  await $.tool.call({ tool: 'Bash', command: '  git log --oneline', tool_use_id: 's1' })
  await $.tool.call({ tool: 'Bash', command: 'git log -n5', tool_use_id: 's2' })
  await $.tool.call({ tool: 'Bash', command: 'git log > log.txt', tool_use_id: 's3' })
  await $.tool.call({ tool: 'Bash', command: 'git log; git status', tool_use_id: 's4' })

  expect(commands).toEqual(['  git log -n 30 --oneline', 'git log -n5', 'git log > log.txt', 'git log; git status'])
})

test('speaks Spanish when the hub says so', async ($, on) => {
  const { toasts } = world(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  const ran = await $.tool.call({ tool: 'Bash', command: 'git log --author=me', tool_use_id: 'e1' })

  expect(toasts).toEqual(['git-log-limit: git log limitado a 30 commits'])
  expect(ran.context?.[0]).toContain('Pass -n, a range (a..b) or a path')
})
