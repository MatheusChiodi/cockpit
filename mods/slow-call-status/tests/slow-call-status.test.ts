import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'

const ANSWER = { result: { stdout: '', stderr: '', interrupted: false } } as never

// The world beneath the mod: a Bash call that stays open until released, and the status line recorded.
const world = (on: On) => {
  const status: (string | undefined)[] = []
  const gate: { release: () => void } = { release: () => undefined }
  on('tool.call', { tool: 'Bash' }, () => new Promise(resolve => (gate.release = () => resolve(ANSWER))))
  on('ui.status', (_$, e) => {
    status.push(e.text)

    return { value: undefined }
  })

  return { status, gate }
}

const sleep = (id: string) => ({ tool: 'Bash', command: 'sleep 60', tool_use_id: id }) as const

test('shows the longest running call once it passes 15 seconds, and clears when it ends', async ($, on) => {
  const clock = mock.clock(on)
  const { status, gate } = world(on)

  const pending = $.tool.call(sleep('a'))
  await clock.advance(10000)
  expect(status.every(text => text === undefined)).toBe(true)

  await clock.advance(10000)
  expect(status.at(-1)).toBe('slow Bash 20s · sleep 60')

  await clock.advance(45000)
  expect(status.at(-1)).toBe('slow Bash 1m05s · sleep 60')

  gate.release()
  await pending
  expect(status.at(-1)).toBeUndefined()
})

test('a call that ends fast never shows', async ($, on) => {
  const clock = mock.clock(on)
  const { status, gate } = world(on)

  const pending = $.tool.call(sleep('b'))
  await clock.advance(3000)
  gate.release()
  await pending
  await clock.advance(30000)

  expect(status.every(text => text === undefined)).toBe(true)
})

test('shows nothing while the hub lists it as off', async ($, on) => {
  const clock = mock.clock(on)
  const { status, gate } = world(on)
  on('state.get', { plugin: 'cockpit', key: 'off' }, () => ({ value: { value: ['slow-call-status'], version: 1 } }))

  const pending = $.tool.call(sleep('c'))
  await clock.advance(30000)
  expect(status.every(text => text === undefined)).toBe(true)

  gate.release()
  await pending
})

test('speaks the language set in the hub', async ($, on) => {
  const clock = mock.clock(on)
  const { status, gate } = world(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  const pending = $.tool.call(sleep('d'))
  await clock.advance(20000)
  expect(status.at(-1)).toBe('lenta Bash 20s · sleep 60')

  gate.release()
  await pending
})

test('shows the oldest of two running calls, then the one left', async ($, on) => {
  const clock = mock.clock(on)
  const status: (string | undefined)[] = []
  const gates: Record<string, () => void> = {}
  on('tool.call', { tool: 'Bash' }, (_$, e) => new Promise(resolve => (gates[e.tool_use_id ?? ''] = () => resolve(ANSWER))))
  on('ui.status', (_$, e) => {
    status.push(e.text)

    return { value: undefined }
  })

  const first = $.tool.call({ tool: 'Bash', command: 'npm test', tool_use_id: 'one' })
  await clock.advance(5000)
  const second = $.tool.call({ tool: 'Bash', command: 'npm run build', tool_use_id: 'two' })
  await clock.advance(15000)
  expect(status.at(-1)).toBe('slow Bash 20s · npm test')

  gates.one?.()
  await first
  await clock.advance(1000)
  expect(status.at(-1)).toBe('slow Bash 16s · npm run build')

  gates.two?.()
  await second
  expect(status.at(-1)).toBeUndefined()
})

test('folds whitespace and cuts the target to 40 characters', async ($, on) => {
  const clock = mock.clock(on)
  const { status, gate } = world(on)

  const pending = $.tool.call({ tool: 'Bash', command: `echo   one\n  two ${'x'.repeat(60)}`, tool_use_id: 'long' })
  await clock.advance(16000)
  expect(status.at(-1)).toBe(`slow Bash 16s · ${`echo one two ${'x'.repeat(60)}`.slice(0, 40)}`)

  gate.release()
  await pending
})

test('names the file of a slow Read and leaves the target out when there is none', async ($, on) => {
  const clock = mock.clock(on)
  const status: (string | undefined)[] = []
  const gates: (() => void)[] = []
  on('tool.call', () => new Promise(resolve => gates.push(() => resolve(ANSWER))))
  on('ui.status', (_$, e) => {
    status.push(e.text)

    return { value: undefined }
  })

  const read = $.tool.call({ tool: 'Read', file_path: '/w/big.log', tool_use_id: 'r' } as never)
  await clock.advance(16000)
  expect(status.at(-1)).toBe('slow Read 16s · /w/big.log')
  gates.forEach(release => release())
  await read

  const list = $.tool.call({ tool: 'TaskList', tool_use_id: 't' } as never)
  await clock.advance(16000)
  expect(status.at(-1)).toBe('slow TaskList 16s')
  gates.forEach(release => release())
  await list
})

test('speaks Spanish when the hub is set to es', async ($, on) => {
  const clock = mock.clock(on)
  const { status, gate } = world(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  const pending = $.tool.call(sleep('e'))
  await clock.advance(125000)
  expect(status.at(-1)).toBe('lenta Bash 2m05s · sleep 60')

  gate.release()
  await pending
})
