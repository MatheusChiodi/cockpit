import type { On } from 'claude-code'
import { expect, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

const duration = (durationMs: number) =>
  ({
    plugin: 'turn-summary',
    component: 'TurnDuration',
    props: { word: 'Baked', durationMs },
    viewport: { columns: 120, rows: 40 },
  }) as const

const world = (on: On) => {
  on('turn.complete', (_$, e) => ({ text: e.answer }))
  on('tool.call', { tool: 'Edit' }, () => ({ result: {} }) as never)
  on('tool.call', { tool: 'Bash' }, (_$, e) =>
    e.command === 'ls' ? { result: { stdout: '', stderr: '', interrupted: false } } : { deny: 'blocked' },
  )
  on('ui.render', { component: 'TurnDuration' }, ($, e) => {
    const { Text } = $.ui.resolve(e)

    return <Text>Baked for {e.props.durationMs}ms</Text>
  })
}

const finish = ($: Engine, durationMs: number) =>
  $.turn.complete({ answer: 'done', durationMs, isAborted: false, turnId: 'u1', reason: 'answer' })

test('sums up a turn: tools, files changed and failures, on terminal and desktop', async ($, on) => {
  world(on)
  await $.tool.call({ tool: 'Edit', file_path: 'a.ts', old_string: 'x', new_string: 'y', tool_use_id: 'e1' })
  await $.tool.call({ tool: 'Edit', file_path: 'a.ts', old_string: 'y', new_string: 'z', tool_use_id: 'e2' })
  await $.tool.call({ tool: 'Bash', command: 'ls', tool_use_id: 'b1' })
  await $.tool.call({ tool: 'Bash', command: 'rm x', tool_use_id: 'b2' })
  await finish($, 3100)

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...duration(3100), surface })

    expect(await ui.find({ type: 'Text', text: /Baked for 3100ms/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /4 tools/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /± 1 file changed/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /1 failed/ })).toBeDefined()
    await ui.unmount()
  }
})

test('keeps each turn apart and says it in Portuguese on request', async ($, on) => {
  world(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))
  await $.tool.call({ tool: 'Bash', command: 'ls', tool_use_id: 'b1' })
  await finish($, 1000)
  await $.tool.call({ tool: 'Bash', command: 'ls', tool_use_id: 'b2' })
  await $.tool.call({ tool: 'Bash', command: 'ls', tool_use_id: 'b3' })
  await finish($, 2000)

  const first = await $.ui.mount({ ...duration(1000), surface: 'terminal' })
  expect(await first.find({ type: 'Text', text: /1 ferramenta/ })).toBeDefined()
  await first.unmount()

  const second = await $.ui.mount({ ...duration(2000), surface: 'terminal' })
  expect(await second.find({ type: 'Text', text: /2 ferramentas/ })).toBeDefined()
  await second.unmount()
})

test('leaves a turn with no tool calls untouched', async ($, on) => {
  world(on)
  await finish($, 900)

  const ui = await $.ui.mount({ ...duration(900), surface: 'terminal' })

  expect(await ui.find({ type: 'Text', text: /tool/ })).toBeUndefined()
  await ui.unmount()
})

test('leaves out the calls and turns of subagents', async ($, on) => {
  world(on)
  await $.tool.call({ tool: 'Bash', command: 'ls', tool_use_id: 's1', agentId: 'a1' } as never)
  await $.tool.call({ tool: 'Bash', command: 'ls', tool_use_id: 'm1' })
  await $.turn.complete({ answer: 'sub', durationMs: 500, isAborted: false, turnId: 's', reason: 'answer', agentId: 'a1' } as never)
  await $.tool.call({ tool: 'Bash', command: 'ls', tool_use_id: 'm2' })
  await finish($, 1500)

  const sub = await $.ui.mount({ ...duration(500), surface: 'terminal' })
  expect(await sub.find({ type: 'Text', text: /tool/ })).toBeUndefined()
  await sub.unmount()

  const main = await $.ui.mount({ ...duration(1500), surface: 'terminal' })
  expect(await main.find({ type: 'Text', text: /2 tools/ })).toBeDefined()
  await main.unmount()
})

test('counts files of Write and NotebookEdit, but not of a failed edit', async ($, on) => {
  world(on)
  on('tool.call', { tool: 'Write' }, (_$, e) => (e.file_path === 'bad.ts' ? ({ result: {}, isError: true } as never) : ({ result: {} } as never)))
  on('tool.call', { tool: 'NotebookEdit' }, () => ({ result: {} }) as never)
  await $.tool.call({ tool: 'Write', file_path: 'b.ts', content: 'x', tool_use_id: 'w1' })
  await $.tool.call({ tool: 'Write', file_path: 'bad.ts', content: 'x', tool_use_id: 'w2' })
  await $.tool.call({ tool: 'NotebookEdit', notebook_path: 'n.ipynb', new_source: 'x', tool_use_id: 'n1' })
  await finish($, 2500)

  const ui = await $.ui.mount({ ...duration(2500), surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /3 tools/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /± 2 files changed/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /1 failed/ })).toBeDefined()
  await ui.unmount()
})

test('leaves a duration line it has no turn for untouched', async ($, on) => {
  world(on)
  await $.tool.call({ tool: 'Bash', command: 'ls', tool_use_id: 'b1' })
  await finish($, 700)

  const ui = await $.ui.mount({ ...duration(701), surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /Baked for 701ms/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /tool/ })).toBeUndefined()
  await ui.unmount()
})

test('speaks Spanish when the hub is set to es', async ($, on) => {
  world(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))
  await $.tool.call({ tool: 'Edit', file_path: 'a.ts', old_string: 'x', new_string: 'y', tool_use_id: 'e1' })
  await $.tool.call({ tool: 'Edit', file_path: 'b.ts', old_string: 'x', new_string: 'y', tool_use_id: 'e2' })
  await $.tool.call({ tool: 'Bash', command: 'rm a', tool_use_id: 'b1' })
  await $.tool.call({ tool: 'Bash', command: 'rm b', tool_use_id: 'b2' })
  await finish($, 4000)

  const ui = await $.ui.mount({ ...duration(4000), surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /4 herramientas/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /2 archivos cambiados/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /2 fallaron/ })).toBeDefined()
  await ui.unmount()
})
