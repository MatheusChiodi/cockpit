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

const lines = (count: number) => Array.from({ length: count }, (_, i) => `row ${i + 1}`).join('\n')

test('folds in Spanish when the hub says so', async ($, on) => {
  bottom(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  const ui = await $.ui.mount({ ...result({ stdout: long, stderr: '' }), surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /… 70 líneas plegadas/ })).toBeDefined()
  await ui.unmount()
})

test('folds from 41 lines on, keeping 15 at each end', async ($, on) => {
  bottom(on)

  const forty = await $.ui.mount({ ...result({ stdout: lines(40), stderr: '' }), surface: 'terminal' })
  expect(await forty.find({ type: 'Text', text: /folded/ })).toBeUndefined()
  await forty.unmount()

  const more = await $.ui.mount({ ...result({ stdout: lines(41), stderr: '' }), surface: 'terminal' })
  const expected = [...Array.from({ length: 15 }, (_, i) => `row ${i + 1}`), '… 11 lines folded', ...Array.from({ length: 15 }, (_, i) => `row ${i + 27}`)].join('\n')
  expect(await more.find({ type: 'Text', text: new RegExp(`^${expected}$`) })).toBeDefined()
  await more.unmount()
})

test('leaves results of other tools and outputs without stdout whole', async ($, on) => {
  on('ui.render', { component: 'ToolResult' }, ($, e) => {
    const { Text } = $.ui.resolve(e)

    return <Text>{JSON.stringify(e.props.output)}</Text>
  })

  const read = await $.ui.mount({
    ...result({ stdout: long, stderr: '' }),
    props: { tool_use_id: 't1', tool: 'Read', output: { stdout: long }, isErrored: false },
    surface: 'terminal',
  })
  expect(await read.find({ type: 'Text', text: /folded/ })).toBeUndefined()
  await read.unmount()

  for (const output of [null, { stdout: 42 }, 'plain text']) {
    const ui = await $.ui.mount({ ...result(output), surface: 'terminal' })
    expect(await ui.find({ type: 'Text', text: /folded/ }), JSON.stringify(output)).toBeUndefined()
    await ui.unmount()
  }
})

test('keeps the other output fields when it folds', async ($, on) => {
  on('ui.render', { component: 'ToolResult' }, ($, e) => {
    const { Text } = $.ui.resolve(e)
    const out = e.props.output as { stderr: string; interrupted: boolean }

    return <Text>{`${out.stderr}|${String(out.interrupted)}`}</Text>
  })

  const ui = await $.ui.mount({ ...result({ stdout: long, stderr: 'warn: x', interrupted: false }), surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /^warn: x\|false$/ })).toBeDefined()
  await ui.unmount()
})
