import type { On } from 'claude-code'
import { expect, test } from 'claude-code/testing'

const call = (tool: string, input: unknown, isErrored = false) => ({
  tool,
  input,
  isRunning: false,
  isErrored,
  isInterrupted: false,
})

const group = (calls: ReturnType<typeof call>[], isActive: boolean, isExpanded = false) =>
  ({
    plugin: 'group-peek',
    component: 'ToolGroup',
    requestId: 'g1',
    props: { calls, isActive, isExpanded },
    viewport: { columns: 120, rows: 40 },
  }) as const

const bottom = (on: On) =>
  on('ui.render', { component: 'ToolGroup' }, ($, e) => {
    const { Text } = $.ui.resolve(e)

    return <Text>Read {e.props.calls.length} files</Text>
  })

test('shows what the live group is on, on terminal and desktop', async ($, on) => {
  bottom(on)

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({
      ...group([call('Read', { file_path: 'a.ts' }), call('Grep', { pattern: 'login' })], true),
      surface,
    })

    expect(await ui.find({ type: 'Text', text: /Read 2 files/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /▸ Grep login/ })).toBeDefined()
    await ui.unmount()
  }
})

test('counts the failures of a settled group, in Portuguese on request', async ($, on) => {
  bottom(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  const ui = await $.ui.mount({
    ...group([call('Read', {}, true), call('Read', {}), call('Grep', {}, true)], false),
    surface: 'terminal',
  })

  expect(await ui.find({ type: 'Text', text: /2 falharam/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /▸/ })).toBeUndefined()
  await ui.unmount()
})

test('leaves a clean settled group and an expanded one untouched', async ($, on) => {
  bottom(on)

  const clean = await $.ui.mount({ ...group([call('Read', {})], false), surface: 'terminal' })
  expect(await clean.find({ type: 'Text', text: /▸|✗/ })).toBeUndefined()
  await clean.unmount()

  const open = await $.ui.mount({ ...group([call('Read', {}, true)], true, true), surface: 'terminal' })
  expect(await open.find({ type: 'Text', text: /▸|✗/ })).toBeUndefined()
  await open.unmount()
})
