import { expect, test } from 'claude-code/testing'
import type { On } from 'claude-code'

const BAND = {
  plugin: 'session-diff-band',
  component: 'AbovePrompt',
  props: {
    hasSurvey: false,
    isWorking: false,
    maxRows: 10,
    bodyColumns: 100,
    scroll: { offset: 0, bodyRows: 10 },
    view: {},
  },
  viewport: { columns: 120, rows: 40 },
} as const

const ANSWER = { result: { stdout: '', stderr: '', interrupted: false } }

// The world beneath the mod: tools that succeed, and the empty box the engine would draw.
const world = (on: On, refuse = false) => {
  on('tool.call', { tool: 'Edit' }, () => (refuse ? { deny: 'no' } : ANSWER))
  on('tool.call', { tool: 'Write' }, () => (refuse ? { deny: 'no' } : ANSWER))
  on('ui.render', { component: 'AbovePrompt' }, ($, e) => {
    const { Box } = $.ui.resolve(e)

    return <Box />
  })
}

const edit = (id: string, oldText: string, newText: string) =>
  ({ tool: 'Edit', file_path: '/p/a.ts', old_string: oldText, new_string: newText, tool_use_id: id }) as const

test('adds up the lines written by edits and writes', async ($, on) => {
  world(on)

  await $.tool.call(edit('e1', 'one', 'one\ntwo\nthree'))
  await $.tool.call({ tool: 'Write', file_path: '/p/b.ts', content: 'a\nb\nc\nd', tool_use_id: 'w1' })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })

    expect(await ui.find({ type: 'Text', text: /WRITTEN/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /\+7/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /−1/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /lines in 2 edits/ })).toBeDefined()
    await ui.unmount()
  }
})

test('draws nothing before anything was written, or when the tools were refused', async ($, on) => {
  world(on, true)

  const before = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await before.find({ type: 'Text', text: /WRITTEN/ })).toBeUndefined()
  await before.unmount()

  await $.tool.call(edit('e2', 'x', 'y'))
  await $.tool.call({ tool: 'Write', file_path: '/p/c.ts', content: 'z', tool_use_id: 'w2' })

  const after = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await after.find({ type: 'Text', text: /WRITTEN/ })).toBeUndefined()
  await after.unmount()
})

test('hides while the hub lists it as off', async ($, on) => {
  world(on)
  on('state.get', { plugin: 'cockpit', key: 'off' }, () => ({ value: { value: ['session-diff-band'], version: 1 } }))

  await $.tool.call(edit('e3', 'a', 'b'))

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /WRITTEN/ })).toBeUndefined()
  await ui.unmount()
})

test('speaks the language set in the hub', async ($, on) => {
  world(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  await $.tool.call(edit('e4', 'a', 'b'))
  await $.tool.call(edit('e5', 'a', 'b'))

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /ESCRITO/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /linhas em 2 edições/ })).toBeDefined()
  await ui.unmount()
})

test('speaks Spanish and uses the singular for one edit', async ($, on) => {
  world(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  await $.tool.call(edit('e6', 'a', 'b'))

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /ESCRITO/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /líneas en 1 edición/ })).toBeDefined()
  await ui.unmount()
})

test('uses the singular in English and Portuguese', async ($, on) => {
  world(on)

  await $.tool.call(edit('e7', 'a', 'b'))

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /lines in 1 edit$/ })).toBeDefined()
  await ui.unmount()
})

test('counts an edit that empties text as removed lines only', async ($, on) => {
  world(on)

  await $.tool.call(edit('e8', 'one\ntwo', ''))

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /\+0/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /−2/ })).toBeDefined()
  await ui.unmount()
})

test('does not count a tool that errored', async ($, on) => {
  on('tool.call', { tool: 'Edit' }, () => ({ isError: true, result: 'old_string not found' }))
  on('ui.render', { component: 'AbovePrompt' }, ($, e) => {
    const { Box } = $.ui.resolve(e)

    return <Box />
  })

  await $.tool.call(edit('e9', 'a', 'b'))

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /WRITTEN/ })).toBeUndefined()
  await ui.unmount()
})

test('hides while a survey takes the space above the prompt', async ($, on) => {
  world(on)

  await $.tool.call(edit('e10', 'a', 'b'))

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal', props: { ...BAND.props, hasSurvey: true } })
  expect(await ui.find({ type: 'Text', text: /WRITTEN/ })).toBeUndefined()
  await ui.unmount()
})
