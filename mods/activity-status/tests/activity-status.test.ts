import { expect, test } from 'claude-code/testing'

const TURN = { answer: '', durationMs: 1, isAborted: false, turnId: 't-1', reason: 'answer' } as const

declare const setTimeout: (run: (value?: unknown) => void, ms: number) => unknown

// The status line is written unawaited by the mod: give it a moment to land.
const flush = () => new Promise(resolve => setTimeout(resolve, 30))

// The world beneath the mod: the hub's switch, the status line recorded, and every tool noting the line before it answers.
// A tool waits for `gate.release()` when the test holds it open.
const world = (on: any, off: string[] = [], isGated = false) => {
  const status: (string | undefined)[] = []
  const during: (string | undefined)[] = []
  const gate: { release: () => void } = { release: () => undefined }
  const opened = new Promise<void>(resolve => {
    gate.release = resolve
  })

  on('state.get', { plugin: 'cockpit', key: 'off' }, () => ({ value: { value: off, version: 1 } }))
  on('ui.status', (_: unknown, e: { text: string | undefined }) => {
    status.push(e.text)

    return { value: undefined }
  })
  on('turn.complete', (_: unknown, e: any) => ({ text: e.answer }))

  const answer = async () => {
    await flush()
    during.push(status.at(-1))

    if (isGated) {
      await opened
    }

    return { result: {} as never }
  }

  on('tool.call', { tool: 'Bash' }, answer)
  on('tool.call', { tool: 'Edit' }, answer)
  on('tool.call', { tool: 'Grep' }, answer)

  return { status, during, gate }
}

test('shows the command running and clears the line when it ends', async ($, on) => {
  const { status, during } = world(on)

  await $.tool.call({ tool: 'Bash', command: 'npm   run\nbuild', tool_use_id: 'b-1' })
  await flush()
  expect(during).toEqual(['▸ Bash npm run build'])
  expect(status.at(-1)).toBeUndefined()
})

test('sums up a file by its name and a search by its pattern', async ($, on) => {
  const { during } = world(on)

  await $.tool.call({ tool: 'Edit', file_path: String.raw`D:\work\src\app.ts`, old_string: 'a', new_string: 'b', tool_use_id: 'e-1' })
  await $.tool.call({ tool: 'Grep', pattern: 'TODO', tool_use_id: 'g-1' })
  expect(during).toEqual(['▸ Edit app.ts', '▸ Grep TODO'])
})

test('cuts a long command to 56 characters', async ($, on) => {
  const { during } = world(on)

  await $.tool.call({ tool: 'Bash', command: 'x'.repeat(100), tool_use_id: 'b-1' })
  expect(during[0]).toBe(`▸ Bash ${'x'.repeat(56)}`)
})

test('ignores the calls of a subagent', async ($, on) => {
  const { status } = world(on)

  await $.tool.call({ tool: 'Bash', command: 'ls', tool_use_id: 'b-1', agentId: 'sub-1' } as never)
  await flush()
  expect(status).toEqual([])
})

test('the end of a turn clears a line left by a call still open', async ($, on) => {
  const { status, gate } = world(on, [], true)

  const open = $.tool.call({ tool: 'Bash', command: 'sleep 99', tool_use_id: 'b-1' })
  await flush()
  await flush()
  expect(status.at(-1)).toBe('▸ Bash sleep 99')

  await $.turn.complete(TURN)
  await flush()
  expect(status.at(-1)).toBeUndefined()

  gate.release()
  await open
})

test('shows nothing while the hub lists it as off', async ($, on) => {
  const { status, during } = world(on, ['activity-status'])

  await $.tool.call({ tool: 'Bash', command: 'ls', tool_use_id: 'b-1' })
  await flush()
  expect(during).toEqual([undefined])
  expect(status.length).toBeGreaterThan(0)
  expect(status.every(text => text === undefined)).toBe(true)
})

test('with parallel calls it shows the newest one still running', async ($, on) => {
  const status: (string | undefined)[] = []
  const gates: Record<string, () => void> = {}
  on('ui.status', (_: unknown, e: { text: string | undefined }) => {
    status.push(e.text)

    return { value: undefined }
  })
  on('tool.call', { tool: 'Bash' }, (_: unknown, e: { tool_use_id: string }) =>
    new Promise(resolve => {
      gates[e.tool_use_id] = () => resolve({ result: {} as never })
    }),
  )

  const first = $.tool.call({ tool: 'Bash', command: 'first', tool_use_id: 'b-1' })
  await flush()
  const second = $.tool.call({ tool: 'Bash', command: 'second', tool_use_id: 'b-2' })
  await flush()
  expect(status.at(-1)).toBe('▸ Bash second')

  gates['b-2']?.()
  await second
  await flush()
  expect(status.at(-1)).toBe('▸ Bash first')

  gates['b-1']?.()
  await first
  await flush()
  expect(status.at(-1)).toBeUndefined()
})

test('a tool without a known field shows just its name, a fetch shows its url', async ($, on) => {
  const during: (string | undefined)[] = []
  const status: (string | undefined)[] = []
  const answer = async () => {
    await flush()
    during.push(status.at(-1))

    return { result: {} as never }
  }
  on('ui.status', (_: unknown, e: { text: string | undefined }) => {
    status.push(e.text)

    return { value: undefined }
  })
  on('tool.call', { tool: 'TodoWrite' }, answer as never)
  on('tool.call', { tool: 'WebFetch' }, answer as never)

  await $.tool.call({ tool: 'TodoWrite', todos: [], tool_use_id: 't-1' } as never)
  await $.tool.call({ tool: 'WebFetch', url: 'https://example.com/docs', prompt: 'read', tool_use_id: 'w-1' } as never)
  expect(during).toEqual(['▸ TodoWrite', '▸ WebFetch https://example.com/docs'])
})

test('clears the line even when the call throws', async ($, on) => {
  const status: (string | undefined)[] = []
  on('ui.status', (_: unknown, e: { text: string | undefined }) => {
    status.push(e.text)

    return { value: undefined }
  })
  on('tool.call', { tool: 'Bash' }, () => {
    throw new Error('crashed')
  })

  await $.tool.call({ tool: 'Bash', command: 'boom', tool_use_id: 'b-1' }).catch(() => undefined)
  await flush()
  expect(status.at(-1)).toBeUndefined()
})

test('a subagent finishing does not clear the main line', async ($, on) => {
  const { status, gate } = world(on, [], true)

  const open = $.tool.call({ tool: 'Bash', command: 'sleep 99', tool_use_id: 'b-1' })
  await flush()
  await flush()
  await $.turn.complete({ ...TURN, agentId: 'sub-1' } as never)
  await flush()
  expect(status.at(-1)).toBe('▸ Bash sleep 99')

  gate.release()
  await open
})
