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
