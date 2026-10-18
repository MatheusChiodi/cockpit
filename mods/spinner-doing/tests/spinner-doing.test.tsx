import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'

const spinner = (props: Record<string, unknown> = {}) =>
  ({
    plugin: 'spinner-doing',
    component: 'Spinner',
    props: { word: 'Sauteing', message: null, suffix: '…', mode: 'tool-use', ...props },
    viewport: { columns: 120, rows: 40 },
  }) as never

// The engine's line: the word and its suffix.
const bottom = (on: On) =>
  on('ui.render', { component: 'Spinner' }, ($, e) => {
    const { Text } = $.ui.resolve(e)

    return (
      <Text>
        {e.props.word}
        {e.props.suffix}
      </Text>
    )
  })

test('names the running call beside the spinner word, on terminal and desktop', async ($, on) => {
  const clock = mock.clock(on)
  bottom(on)
  on('tool.call', { tool: 'Bash' }, async () => {
    await clock.sleep(5000)

    return { result: { stdout: '', stderr: '', interrupted: false } }
  })

  const call = $.tool.call({ tool: 'Bash', command: 'npm test', tool_use_id: 't1' })
  await clock.advance(1000)

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...(spinner() as object), surface } as never)

    expect(await ui.find({ type: 'Text', text: /Sauteing… Bash npm test/ })).toBeDefined()
    await ui.unmount()
  }

  await clock.advance(5000)
  await call
})

test('goes back to the engine line once the call ends', async ($, on) => {
  mock.clock(on)
  bottom(on)
  on('tool.call', { tool: 'Bash' }, () => ({ result: { stdout: '', stderr: '', interrupted: false } }))

  await $.tool.call({ tool: 'Bash', command: 'ls', tool_use_id: 't1' })
  const ui = await $.ui.mount({ ...(spinner() as object), surface: 'terminal' } as never)

  expect(await ui.find({ type: 'Text', text: /^Sauteing…$/ })).toBeDefined()
  await ui.unmount()
})

test('leaves a spinner that carries its own message', async ($, on) => {
  const clock = mock.clock(on)
  bottom(on)
  on('tool.call', { tool: 'Bash' }, async () => {
    await clock.sleep(5000)

    return { result: { stdout: '', stderr: '', interrupted: false } }
  })

  const call = $.tool.call({ tool: 'Bash', command: 'npm test', tool_use_id: 't1' })
  await clock.advance(1000)

  const ui = await $.ui.mount({ ...(spinner({ message: 'Compacting' }) as object), surface: 'terminal' } as never)

  expect(await ui.find({ type: 'Text', text: /npm test/ })).toBeUndefined()
  await ui.unmount()
  await clock.advance(5000)
  await call
})

test('ignores calls made by a subagent', async ($, on) => {
  const clock = mock.clock(on)
  bottom(on)
  on('tool.call', { tool: 'Bash' }, async () => {
    await clock.sleep(5000)

    return { result: { stdout: '', stderr: '', interrupted: false } }
  })

  const call = $.tool.call({ tool: 'Bash', command: 'npm test', tool_use_id: 't1', agentId: 'sub-1' } as never)
  await clock.advance(1000)

  const ui = await $.ui.mount({ ...(spinner() as object), surface: 'terminal' } as never)
  expect(await ui.find({ type: 'Text', text: /^Sauteing…$/ })).toBeDefined()
  await ui.unmount()
  await clock.advance(5000)
  await call
})

test('leaves the spinner alone while the model is thinking', async ($, on) => {
  const clock = mock.clock(on)
  bottom(on)
  on('tool.call', { tool: 'Bash' }, async () => {
    await clock.sleep(5000)

    return { result: { stdout: '', stderr: '', interrupted: false } }
  })

  const call = $.tool.call({ tool: 'Bash', command: 'npm test', tool_use_id: 't1' })
  await clock.advance(1000)

  const ui = await $.ui.mount({ ...(spinner({ mode: 'thinking' }) as object), surface: 'terminal' } as never)
  expect(await ui.find({ type: 'Text', text: /npm test/ })).toBeUndefined()
  await ui.unmount()
  await clock.advance(5000)
  await call
})

test('cuts a long label to 48 characters with an ellipsis', async ($, on) => {
  const clock = mock.clock(on)
  bottom(on)
  on('tool.call', { tool: 'Bash' }, async () => {
    await clock.sleep(5000)

    return { result: { stdout: '', stderr: '', interrupted: false } }
  })

  const long = `echo ${'x'.repeat(80)}`
  const call = $.tool.call({ tool: 'Bash', command: long, tool_use_id: 'b1' })
  await clock.advance(1000)

  const ui = await $.ui.mount({ ...(spinner() as object), surface: 'terminal' } as never)
  const label = `Bash ${long}`.slice(0, 47)
  expect(await ui.find({ type: 'Text', text: `Sauteing… ${label}…` })).toBeDefined()
  await ui.unmount()
  await clock.advance(5000)
  await call
})

test('collapses line breaks in the command into single spaces', async ($, on) => {
  const clock = mock.clock(on)
  bottom(on)
  on('tool.call', { tool: 'Bash' }, async () => {
    await clock.sleep(5000)

    return { result: { stdout: '', stderr: '', interrupted: false } }
  })

  const call = $.tool.call({ tool: 'Bash', command: 'npm run\n  build', tool_use_id: 'b2' })
  await clock.advance(1000)

  const ui = await $.ui.mount({ ...(spinner() as object), surface: 'terminal' } as never)
  expect(await ui.find({ type: 'Text', text: /Bash npm run build$/ })).toBeDefined()
  await ui.unmount()
  await clock.advance(5000)
  await call
})

test('the later of two overlapping calls holds the label until it ends', async ($, on) => {
  const clock = mock.clock(on)
  bottom(on)
  on('tool.call', { tool: 'Bash' }, async ($, e) => {
    await clock.sleep(e.command === 'first' ? 2000 : 6000)

    return { result: { stdout: '', stderr: '', interrupted: false } }
  })

  const first = $.tool.call({ tool: 'Bash', command: 'first', tool_use_id: 'f1' })
  const second = $.tool.call({ tool: 'Bash', command: 'second', tool_use_id: 's1' })
  await clock.advance(3000)
  await first

  const ui = await $.ui.mount({ ...(spinner() as object), surface: 'terminal' } as never)
  expect(await ui.find({ type: 'Text', text: /Bash second$/ })).toBeDefined()
  await ui.unmount()
  await clock.advance(5000)
  await second
})
