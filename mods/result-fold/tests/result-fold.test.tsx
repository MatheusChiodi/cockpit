import type { On } from 'claude-code'
import { expect, test } from 'claude-code/testing'

const result = (output: unknown, isErrored = false) =>
  ({
    plugin: 'result-fold',
    component: 'ToolResult',
    requestId: 't1',
    props: { tool_use_id: 't1', tool: 'Bash', output, isErrored },
    viewport: { columns: 120, rows: 40 },
  }) as const

// The engine's drawing: the stdout it was handed, one Text.
const bottom = (on: On) =>
  on('ui.render', { component: 'ToolResult' }, ($, e) => {
    const { Text } = $.ui.resolve(e)
    const out = e.props.output as { stdout: string }

    return <Text>{out.stdout}</Text>
  })

const long = Array.from({ length: 100 }, (_, i) => `line ${i + 1}`).join('\n')

test('folds a long result to its first and last lines, on terminal and desktop', async ($, on) => {
  bottom(on)

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...result({ stdout: long, stderr: '' }), surface })

    expect(await ui.find({ type: 'Text', text: /line 1\n/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /line 100/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /… 70 lines folded/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /line 50\n/ })).toBeUndefined()
    await ui.unmount()
  }
})

test('leaves a short result and an errored one whole', async ($, on) => {
  bottom(on)

  const short = await $.ui.mount({ ...result({ stdout: 'a\nb', stderr: '' }), surface: 'terminal' })
  expect(await short.find({ type: 'Text', text: /folded/ })).toBeUndefined()
  await short.unmount()

  const failed = await $.ui.mount({ ...result({ stdout: long, stderr: '' }, true), surface: 'terminal' })
  expect(await failed.find({ type: 'Text', text: /folded/ })).toBeUndefined()
  await failed.unmount()
})

test('folds in Portuguese when the hub says so', async ($, on) => {
  bottom(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  const ui = await $.ui.mount({ ...result({ stdout: long, stderr: '' }), surface: 'terminal' })

  expect(await ui.find({ type: 'Text', text: /70 linhas dobradas/ })).toBeDefined()
  await ui.unmount()
})
