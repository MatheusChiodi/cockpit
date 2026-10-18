import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { On } from 'claude-code'

// The world beneath the mod: the command takes `ms` of the clock and ends as its text says.
const world = (on: On, clock: { advance: (ms: number) => Promise<void> }, ms = 1200) => {
  const status: (string | undefined)[] = []
  on('tool.call', { tool: 'Bash' }, async (_$, e) => {
    await clock.advance(ms)

    if (e.command.includes('deny')) {
      return { deny: 'blocked' }
    }

    return {
      result: { stdout: '', stderr: '', interrupted: e.command.includes('stop') },
      ...(e.command.includes('fail') ? { isError: true } : {}),
    } as never
  })
  on('ui.status', (_$, e) => {
    status.push(e.text)

    return { value: undefined }
  })

  return status
}

let id = 0

const bash = ($: Engine, command: string) => $.tool.call({ tool: 'Bash', command, tool_use_id: `b${(id += 1)}` })

test('shows how the last command ended, how long it took and what it was', async ($, on) => {
  const clock = mock.clock(on)
  const status = world(on, clock)

  await bash($, 'npm run build')
  expect(status.at(-1)).toBe('cmd ✓ 1.2s · npm run build')

  await bash($, 'npm run  lint --fail')
  expect(status.at(-1)).toBe('cmd ✗ 1.2s · npm run lint --fail')

  await bash($, 'sleep 100 --stop')
  expect(status.at(-1)).toBe('cmd ✗ interrupted 1.2s · sleep 100 --stop')
})

test('formats long and short durations', async ($, on) => {
  const clock = mock.clock(on)
  const short = world(on, clock, 340)
  await bash($, 'ls')
  expect(short.at(-1)).toBe('cmd ✓ 340ms · ls')
})

test('a refused call leaves the previous line alone', async ($, on) => {
  const clock = mock.clock(on)
  const status = world(on, clock)

  await bash($, 'echo ok')
  await bash($, 'echo deny')
  expect(status).toEqual(['cmd ✓ 1.2s · echo ok'])
})

test('shows nothing while the hub lists it as off', async ($, on) => {
  const clock = mock.clock(on)
  const status = world(on, clock)
  on('state.get', { plugin: 'cockpit', key: 'off' }, () => ({ value: { value: ['last-cmd-status'], version: 1 } }))

  await bash($, 'echo ok')
  expect(status.every(text => text === undefined)).toBe(true)
})

test('speaks the language set in the hub', async ($, on) => {
  const clock = mock.clock(on)
  const status = world(on, clock)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  await bash($, 'sleep 9 --stop')
  expect(status.at(-1)).toBe('cmd ✗ interrompido 1.2s · sleep 9 --stop')
})

test('formats durations of a minute and more as minutes and seconds', async ($, on) => {
  const clock = mock.clock(on)
  const status = world(on, clock, 125400)

  await bash($, 'npm test')
  expect(status.at(-1)).toBe('cmd ✓ 2m05s · npm test')
})

test('cuts the command to 40 characters and collapses its whitespace', async ($, on) => {
  const clock = mock.clock(on)
  const status = world(on, clock)

  await bash($, `  echo\n${'a'.repeat(60)}  `)
  expect(status.at(-1)).toBe(`cmd ✓ 1.2s · ${`echo ${'a'.repeat(60)}`.slice(0, 40)}`)
})

test('watches PowerShell commands too', async ($, on) => {
  const clock = mock.clock(on)
  const status = world(on, clock)
  on('tool.call', { tool: 'PowerShell' }, async () => {
    await clock.advance(500)

    return { result: { stdout: '', stderr: '', interrupted: false } } as never
  })

  await $.tool.call({ tool: 'PowerShell', command: 'Get-ChildItem', tool_use_id: 'p1' })
  expect(status.at(-1)).toBe('cmd ✓ 500ms · Get-ChildItem')
})

test('passes the answer beneath through, refused or not', async ($, on) => {
  const clock = mock.clock(on)
  world(on, clock)

  const refused = await bash($, 'echo deny')
  expect(refused.deny).toBe('blocked')

  const ran = await bash($, 'echo ok')
  expect(ran.deny).toBeUndefined()
})

test('speaks Spanish when the hub language is es', async ($, on) => {
  const clock = mock.clock(on)
  const status = world(on, clock)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  await bash($, 'sleep 9 --stop')
  expect(status.at(-1)).toBe('cmd ✗ interrumpido 1.2s · sleep 9 --stop')
})
