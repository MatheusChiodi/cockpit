import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { On } from 'claude-code'

// The world beneath the mod: a command that fails when it says "fail", the edit tools, and the status line.
const world = (on: On) => {
  const status: (string | undefined)[] = []
  on('tool.call', { tool: 'Bash' }, (_$, e) =>
    e.command.includes('fail') ? ({ result: {}, isError: true } as never) : ({ result: {} } as never),
  )
  on('tool.call', { tool: 'Edit' }, () => ({ result: {} }) as never)
  on('ui.status', (_$, e) => {
    status.push(e.text)

    return { value: undefined }
  })

  return status
}

let id = 0

const bash = ($: Engine, command: string) => $.tool.call({ tool: 'Bash', command, tool_use_id: `b${(id += 1)}` })

const edit = ($: Engine) =>
  $.tool.call({ tool: 'Edit', file_path: '/a.ts', old_string: 'a', new_string: 'b', tool_use_id: `e${(id += 1)}` })

test('shows the age of the last green run and the edits made since', async ($, on) => {
  const clock = mock.clock(on)
  const status = world(on)

  await bash($, 'npm test')
  expect(status.at(-1)).toBe('green now')

  await clock.advance(14 * 60000)
  expect(status.at(-1)).toBe('green 14m ago')

  await edit($)
  await edit($)
  expect(status.at(-1)).toBe('green 14m ago · 2 edits since')

  await clock.advance(61 * 60000)
  expect(status.at(-1)).toBe('green 1h15m ago · 2 edits since')
})

test('a green run resets the edits, and a failing or unrelated command changes nothing', async ($, on) => {
  const clock = mock.clock(on)
  const status = world(on)

  await edit($)
  expect(status.length).toBe(0)

  await bash($, 'npm test')
  await edit($)
  expect(status.at(-1)).toBe('green now · 1 edit since')

  await clock.advance(5 * 60000)
  await bash($, 'npm test --fail')
  await bash($, 'ls')
  expect(status.at(-1)).toBe('green 5m ago · 1 edit since')

  await bash($, 'npx vitest run')
  expect(status.at(-1)).toBe('green now')
})

test('shows nothing while the hub lists it as off', async ($, on) => {
  mock.clock(on)
  const status = world(on)
  on('state.get', { plugin: 'cockpit', key: 'off' }, () => ({ value: { value: ['green-age-status'], version: 1 } }))

  await bash($, 'npm test')
  expect(status.every(text => text === undefined)).toBe(true)
})

test('speaks the language set in the hub', async ($, on) => {
  const clock = mock.clock(on)
  const status = world(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  await bash($, 'npm test')
  await clock.advance(3 * 60000)
  await edit($)

  expect(status.at(-1)).toBe('verde há 3m · 1 edição desde então')
})

test('speaks Spanish when the hub is set to es', async ($, on) => {
  const clock = mock.clock(on)
  const status = world(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  await bash($, 'pytest -q')
  expect(status.at(-1)).toBe('verde ahora')

  await clock.advance(2 * 60000)
  await edit($)
  await edit($)
  expect(status.at(-1)).toBe('verde hace 2m · 2 ediciones desde entonces')
})

test('Portuguese counts more than one edit in the plural', async ($, on) => {
  mock.clock(on)
  const status = world(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  await bash($, 'cargo test')
  await edit($)
  await edit($)
  expect(status.at(-1)).toBe('verde agora · 2 edições desde então')
})

test('recognises the test runners of several stacks', async ($, on) => {
  mock.clock(on)
  const status = world(on)

  for (const command of ['pnpm run test', 'go test ./...', 'dotnet test', 'npx jest --ci', 'claude plugin test mods/x', 'npx playwright test']) {
    status.length = 0
    await edit($)
    await bash($, command)
    expect(status.at(-1), command).toBe('green now')
  }
})

test('a command refused before it ran does not count as green', async ($, on) => {
  mock.clock(on)
  const status: (string | undefined)[] = []
  on('tool.call', { tool: 'Bash' }, () => ({ deny: 'blocked' }))
  on('ui.status', (_$, e) => {
    status.push(e.text)

    return { value: undefined }
  })

  await bash($, 'npm test')
  expect(status).toEqual([])
})

test('counts Write calls as edits and a test run through PowerShell as green', async ($, on) => {
  mock.clock(on)
  const status = world(on)
  on('tool.call', { tool: 'PowerShell' }, () => ({ result: {} }) as never)
  on('tool.call', { tool: 'Write' }, () => ({ result: {} }) as never)

  await $.tool.call({ tool: 'PowerShell', command: 'npm test', tool_use_id: 'p1' })
  expect(status.at(-1)).toBe('green now')

  await $.tool.call({ tool: 'Write', file_path: '/b.ts', content: 'x', tool_use_id: 'w1' })
  expect(status.at(-1)).toBe('green now · 1 edit since')
})

test('an edit that failed is not counted', async ($, on) => {
  mock.clock(on)
  const status = world(on)
  on('tool.call', { tool: 'Write' }, () => ({ result: 'disk full', isError: true }) as never)

  await bash($, 'npm test')
  await $.tool.call({ tool: 'Write', file_path: '/b.ts', content: 'x', tool_use_id: 'w1' })
  expect(status.at(-1)).toBe('green now')
})

test('a tick inside the same minute does not redraw', async ($, on) => {
  const clock = mock.clock(on)
  const status = world(on)

  await bash($, 'npm test')
  await clock.advance(30000)
  expect(status).toEqual(['green now'])
})

// Stands in for the hub: a /flip command that writes its own `off` list, as the settings pane does.
const HUB = {
  name: 'cockpit',
  register: (on: On) => {
    on('command.run', { command: 'flip' }, async ($, e) => {
      await $.state.set({ plugin: 'cockpit', key: 'off' }, e.args === 'off' ? ['green-age-status'] : [])

      return { text: 'flipped' }
    })
  },
}

const flip = (args: string) => ({
  command: 'flip',
  args,
  origin: { kind: 'composer' } as const,
  presentation: { isFullscreen: false, columns: 80 },
})

test('clears the entry when the hub turns it off and draws it again when turned back on', { plugins: [HUB] }, async ($, on) => {
  mock.clock(on)
  const status = world(on)

  await bash($, 'npm test')
  expect(status.at(-1)).toBe('green now')

  await $.command.run(flip('off'))
  expect(status.at(-1)).toBeUndefined()

  await $.command.run(flip('on'))
  expect(status.at(-1)).toBe('green now')
})
