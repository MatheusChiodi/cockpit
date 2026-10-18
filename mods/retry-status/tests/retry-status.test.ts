import { expect, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { On } from 'claude-code'

// The world beneath the mod: `npm run build` fails until `fixed` is set, everything else passes.
const world = (on: On) => {
  const status: (string | undefined)[] = []
  const state = { fixed: false }
  on('tool.call', { tool: 'Bash' }, (_$, e) =>
    e.command.includes('build') && !state.fixed
      ? ({ result: {}, isError: true } as never)
      : ({ result: {} } as never),
  )
  on('ui.status', (_$, e) => {
    status.push(e.text)

    return { value: undefined }
  })

  return { status, state }
}

let id = 0

const bash = ($: Engine, command: string) => $.tool.call({ tool: 'Bash', command, tool_use_id: `b${(id += 1)}` })

test('counts the repeated failures of the same command from the second on', async ($, on) => {
  const { status } = world(on)

  await bash($, 'npm run build')
  expect(status.every(text => text === undefined)).toBe(true)

  await bash($, 'npm  run build')
  expect(status.at(-1)).toBe('retry ✗ x2 · npm run build')

  await bash($, 'npm run build')
  expect(status.at(-1)).toBe('retry ✗ x3 · npm run build')
})

test('clears when the command passes and ignores other commands passing', async ($, on) => {
  const { status, state } = world(on)

  await bash($, 'npm run build')
  await bash($, 'npm run build')
  await bash($, 'ls')
  expect(status.at(-1)).toBe('retry ✗ x2 · npm run build')

  state.fixed = true
  await bash($, 'npm run build')
  expect(status.at(-1)).toBeUndefined()
})

test('a different failing command starts a new count', async ($, on) => {
  const { status } = world(on)

  await bash($, 'npm run build')
  await bash($, 'npm run build')
  await bash($, 'npm run build:all')
  expect(status.at(-1)).toBeUndefined()
})

test('shows nothing while the hub lists it as off', async ($, on) => {
  const { status } = world(on)
  on('state.get', { plugin: 'cockpit', key: 'off' }, () => ({ value: { value: ['retry-status'], version: 1 } }))

  await bash($, 'npm run build')
  await bash($, 'npm run build')
  expect(status.every(text => text === undefined)).toBe(true)
})

test('speaks the language set in the hub', async ($, on) => {
  const { status } = world(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  await bash($, 'npm run build')
  await bash($, 'npm run build')
  expect(status.at(-1)).toBe('tentativa ✗ x2 · npm run build')
})

test('speaks Spanish when the hub is set to es', async ($, on) => {
  const { status } = world(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  await bash($, 'npm run build')
  await bash($, 'npm run build')
  expect(status.at(-1)).toBe('reintento ✗ x2 · npm run build')
})

test('cuts a long command to 40 characters', async ($, on) => {
  const { status } = world(on)
  const command = `npm run build -- --filter ${'pkg-'.repeat(20)}`

  await bash($, command)
  await bash($, command)
  expect(status.at(-1)).toBe(`retry ✗ x2 · ${command.slice(0, 40)}`)
})

test('a denied run neither counts nor breaks the streak', async ($, on) => {
  const status: (string | undefined)[] = []
  const answer = { deny: false }
  on('tool.call', { tool: 'Bash' }, () => (answer.deny ? { deny: 'refused' } : ({ result: {}, isError: true } as never)))
  on('ui.status', (_$, e) => {
    status.push(e.text)

    return { value: undefined }
  })

  await bash($, 'make')
  answer.deny = true
  await bash($, 'make')
  expect(status.every(text => text === undefined)).toBe(true)

  answer.deny = false
  await bash($, 'make')
  expect(status.at(-1)).toBe('retry ✗ x2 · make')
})

test('counts failures in PowerShell too', async ($, on) => {
  const status: (string | undefined)[] = []
  on('tool.call', { tool: 'PowerShell' }, () => ({ result: {}, isError: true }) as never)
  on('ui.status', (_$, e) => {
    status.push(e.text)

    return { value: undefined }
  })

  for (let n = 0; n < 3; n += 1) {
    await $.tool.call({ tool: 'PowerShell', command: 'dotnet build', tool_use_id: `p${(id += 1)}` })
  }

  expect(status.at(-1)).toBe('retry ✗ x3 · dotnet build')
})

// Stands in for the hub: a /flip command that writes its own `off` list, as the settings pane does.
const HUB = {
  name: 'cockpit',
  register: (on: any) => {
    on('command.run', { command: 'flip' }, async ($: any) => {
      await $.state.set({ plugin: 'cockpit', key: 'off' }, ['retry-status'])

      return { text: 'flipped' }
    })
  },
}

test('clears the entry when the hub turns it off', { plugins: [HUB] }, async ($, on) => {
  const { status } = world(on)

  await bash($, 'npm run build')
  await bash($, 'npm run build')
  expect(status.at(-1)).toBe('retry ✗ x2 · npm run build')

  await $.command.run({ command: 'flip', args: '', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 80 } })
  expect(status.at(-1)).toBeUndefined()

  await bash($, 'npm run build')
  expect(status.at(-1)).toBeUndefined()
})
