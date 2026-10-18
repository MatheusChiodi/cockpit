import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'

const row = (id: string, tool = 'Bash', isErrored = false) =>
  ({
    plugin: 'tool-clock',
    component: 'ToolUse',
    requestId: id,
    props: {
      tool_use_id: id,
      tool,
      input: {},
      isRunning: false,
      isErrored,
      isInterrupted: false,
    },
    viewport: { columns: 120, rows: 40 },
  }) as const

const bottom = (on: On) =>
  on('ui.render', { component: 'ToolUse' }, ($, e) => {
    const { Text } = $.ui.resolve(e)

    return <Text>{e.props.tool}(call)</Text>
  })

test('adds the duration of a slow call on terminal and desktop', async ($, on) => {
  const clock = mock.clock(on)
  bottom(on)
  on('tool.call', { tool: 'Bash' }, async () => {
    await clock.sleep(14200)

    return { result: { stdout: '', stderr: '', interrupted: false } }
  })

  const call = $.tool.call({ tool: 'Bash', command: 'npm test', tool_use_id: 't1' })
  await clock.advance(14200)
  await call

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...row('t1'), surface })

    expect(await ui.find({ type: 'Text', text: /Bash\(call\)/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /14\.2s/ })).toBeDefined()
    await ui.unmount()
  }
})

test('leaves a quick call untouched', async ($, on) => {
  mock.clock(on)
  bottom(on)
  on('tool.call', { tool: 'Bash' }, () => ({ result: { stdout: '', stderr: '', interrupted: false } }))

  await $.tool.call({ tool: 'Bash', command: 'ls', tool_use_id: 't2' })
  const ui = await $.ui.mount({ ...row('t2'), surface: 'terminal' })

  expect(await ui.find({ type: 'Text', text: /ms|\ds/ })).toBeUndefined()
  await ui.unmount()
})

test('tags a subagent call and shows it in Portuguese', async ($, on) => {
  mock.clock(on)
  bottom(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))
  on('tool.call', { tool: 'Read' }, () => ({ result: { type: 'text', file: { filePath: 'a', content: '', numLines: 0, startLine: 1, totalLines: 0 } } }) as never)

  await $.tool.call({ tool: 'Read', file_path: 'a.ts', tool_use_id: 't3', agentId: 'a1' } as never)
  const ui = await $.ui.mount({ ...row('t3', 'Read'), surface: 'terminal' })

  expect(await ui.find({ type: 'Text', text: /subagente/ })).toBeDefined()
  await ui.unmount()
})

test('says failed on an errored row', async ($, on) => {
  const clock = mock.clock(on)
  bottom(on)
  on('tool.call', { tool: 'Bash' }, async () => {
    await clock.sleep(3000)

    return { result: { stdout: '', stderr: '', interrupted: false } }
  })

  const call = $.tool.call({ tool: 'Bash', command: 'npm run build', tool_use_id: 't4' })
  await clock.advance(3000)
  await call

  const ui = await $.ui.mount({ ...row('t4', 'Bash', true), surface: 'terminal' })

  expect(await ui.find({ type: 'Text', text: /failed/ })).toBeDefined()
  await ui.unmount()
})

const slowBash = (on: On, clock: { sleep: (ms: number) => Promise<void> }, ms: number) =>
  on('tool.call', { tool: 'Bash' }, async () => {
    await clock.sleep(ms)

    return { result: { stdout: '', stderr: '', interrupted: false } }
  })

test('shows minutes and seconds past a minute', async ($, on) => {
  const clock = mock.clock(on)
  bottom(on)
  slowBash(on, clock, 125000)

  const call = $.tool.call({ tool: 'Bash', command: 'npm ci', tool_use_id: 'm1' })
  await clock.advance(125000)
  await call

  const ui = await $.ui.mount({ ...row('m1'), surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /2m 5s/ })).toBeDefined()
  await ui.unmount()
})

test('leaves a running row and an unknown row untouched', async ($, on) => {
  const clock = mock.clock(on)
  bottom(on)
  slowBash(on, clock, 5000)

  const call = $.tool.call({ tool: 'Bash', command: 'sleep 5', tool_use_id: 'r1' })
  await clock.advance(5000)
  await call

  const running = await $.ui.mount({ ...row('r1'), props: { ...row('r1').props, isRunning: true }, surface: 'terminal' })
  expect(await running.find({ type: 'Text', text: /5\.0s/ })).toBeUndefined()
  await running.unmount()

  const unknown = await $.ui.mount({ ...row('never-ran', 'Bash', true), surface: 'terminal' })
  expect(await unknown.find({ type: 'Text', text: /failed/ })).toBeUndefined()
  await unknown.unmount()
})

test('a quick failed call says failed without a time', async ($, on) => {
  mock.clock(on)
  bottom(on)
  on('tool.call', { tool: 'Bash' }, () => ({ result: { stdout: '', stderr: '', interrupted: false } }))

  await $.tool.call({ tool: 'Bash', command: 'false', tool_use_id: 'q1' })
  const ui = await $.ui.mount({ ...row('q1', 'Bash', true), surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /failed/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /\d+ms/ })).toBeUndefined()
  await ui.unmount()
})

test('a slow subagent call shows both, in Spanish', async ($, on) => {
  const clock = mock.clock(on)
  bottom(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))
  slowBash(on, clock, 2500)

  const call = $.tool.call({ tool: 'Bash', command: 'make', tool_use_id: 's1', agentId: 'a1' } as never)
  await clock.advance(2500)
  await call

  const ui = await $.ui.mount({ ...row('s1', 'Bash', true), surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /2\.5s {2}subagente/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /falló/ })).toBeDefined()
  await ui.unmount()
})
