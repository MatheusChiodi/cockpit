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

test('picks the first meaningful argument and folds whitespace', async ($, on) => {
  bottom(on)

  const ui = await $.ui.mount({
    ...group([call('Bash', { description: 'list', command: 'ls  -la\n  src', file_path: 'x' })], true),
    surface: 'terminal',
  })
  expect(await ui.find({ type: 'Text', text: /▸ Bash ls -la src/ })).toBeDefined()
  await ui.unmount()

  const empty = await $.ui.mount({ ...group([call('WebFetch', { url: '', query: 'docs' })], true), surface: 'terminal' })
  expect(await empty.find({ type: 'Text', text: /▸ WebFetch docs/ })).toBeDefined()
  await empty.unmount()
})

test('names only the tool when the call has no known argument', async ($, on) => {
  bottom(on)

  const ui = await $.ui.mount({ ...group([call('TodoWrite', null)], true), surface: 'terminal' })
  const found = await ui.find({ type: 'Text', text: /▸ TodoWrite/ })
  expect(found).toBeDefined()
  await ui.unmount()
})

test('shows both the live call and the failures of an active group', async ($, on) => {
  bottom(on)

  const ui = await $.ui.mount({ ...group([call('Read', { path: 'a' }, true), call('Glob', { pattern: '**/*.ts' })], true), surface: 'desktop' })
  expect(await ui.find({ type: 'Text', text: /▸ Glob \*\*\/\*\.ts/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /✗ 1 failed/ })).toBeDefined()
  await ui.unmount()
})

test('leaves an empty group untouched', async ($, on) => {
  bottom(on)

  const ui = await $.ui.mount({ ...group([], true), surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /Read 0 files/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /▸|✗/ })).toBeUndefined()
  await ui.unmount()
})

test('speaks Spanish and Portuguese in the singular', async ($, on) => {
  bottom(on)
  let lang = 'es'
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: lang, version: 1 } }))

  const es = await $.ui.mount({ ...group([call('Read', {}, true)], false), surface: 'terminal' })
  expect(await es.find({ type: 'Text', text: /✗ 1 falló/ })).toBeDefined()
  await es.unmount()

  const many = await $.ui.mount({ ...group([call('Read', {}, true), call('Read', {}, true)], false), surface: 'terminal' })
  expect(await many.find({ type: 'Text', text: /2 fallaron/ })).toBeDefined()
  await many.unmount()

  lang = 'pt'
  const pt = await $.ui.mount({ ...group([call('Read', {}, true)], false), surface: 'terminal' })
  expect(await pt.find({ type: 'Text', text: /✗ 1 falhou/ })).toBeDefined()
  await pt.unmount()
})
