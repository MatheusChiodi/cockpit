import type { On } from 'claude-code'
import { expect, test } from 'claude-code/testing'

const pill = (hint: string) =>
  ({
    plugin: 'bg-hint',
    component: 'ToolProgress',
    requestId: 'p1',
    props: { tool_use_id: 't1', kind: 'background_hint', hint },
    viewport: { columns: 120, rows: 40 },
  }) as const

const bottom = (on: On) =>
  on('ui.render', { component: 'ToolProgress' }, ($, e) => {
    const { Text } = $.ui.resolve(e)

    return <Text dimColor>{e.props.hint}</Text>
  })

test('speaks the language of the hub and keeps the person key binding', async ($, on) => {
  bottom(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  const ui = await $.ui.mount({ ...pill('(ctrl+x b to run in background)'), surface: 'terminal' })

  expect(await ui.find({ type: 'Text', text: /\(ctrl\+x b para rodar em segundo plano\)/ })).toBeDefined()
  await ui.unmount()
})

test('draws the engine pill in English by default', async ($, on) => {
  bottom(on)

  const ui = await $.ui.mount({ ...pill('(ctrl+b to run in background)'), surface: 'terminal' })

  expect(await ui.find({ type: 'Text', text: /\(ctrl\+b to run in background\)/ })).toBeDefined()
  await ui.unmount()
})

test('leaves a hint it does not recognise', async ($, on) => {
  bottom(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  const ui = await $.ui.mount({ ...pill('something else'), surface: 'terminal' })

  expect(await ui.find({ type: 'Text', text: /something else/ })).toBeDefined()
  await ui.unmount()
})

test('speaks Spanish on terminal and desktop', async ($, on) => {
  bottom(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...pill('(ctrl+b to run in background)'), surface })

    expect(await ui.find({ type: 'Text', text: /\(ctrl\+b para ejecutar en segundo plano\)/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /to run in background/ })).toBeUndefined()
    await ui.unmount()
  }
})

test('leaves a hint with more words around the engine text', async ($, on) => {
  bottom(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  const ui = await $.ui.mount({ ...pill('(ctrl+b to run in background) · 3 queued'), surface: 'terminal' })

  expect(await ui.find({ type: 'Text', text: /\(ctrl\+b to run in background\) · 3 queued/ })).toBeDefined()
  await ui.unmount()
})

test('passes the rest of the props beneath untouched', async ($, on) => {
  const seen: unknown[] = []
  on('ui.render', { component: 'ToolProgress' }, ($, e) => {
    seen.push(e.props)
    const { Text } = $.ui.resolve(e)

    return <Text>{e.props.hint}</Text>
  })
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  const ui = await $.ui.mount({ ...pill('(alt+b to run in background)'), surface: 'terminal' })
  expect(seen.at(-1)).toEqual({ tool_use_id: 't1', kind: 'background_hint', hint: '(alt+b para rodar em segundo plano)' })
  await ui.unmount()
})
