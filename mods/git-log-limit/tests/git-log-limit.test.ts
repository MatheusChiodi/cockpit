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
