import type { On } from 'claude-code'
import { expect, test } from 'claude-code/testing'

const output = (text: string) =>
  ({
    plugin: 'output-lines',
    component: 'CommandOutput',
    requestId: 'c1',
    props: { command: 'tally', args: '', text, isErrored: false },
    viewport: { columns: 120, rows: 40 },
  }) as const

const bottom = (on: On) =>
  on('ui.render', { component: 'CommandOutput' }, ($, e) => {
    const { Text } = $.ui.resolve(e)

    return <Text>{e.props.text.split('\n')[0]}</Text>
  })

const many = Array.from({ length: 48 }, (_, i) => `row ${i + 1}`).join('\n')

test('heads a long output with its line count, on terminal and desktop', async ($, on) => {
  bottom(on)

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...output(many), surface })

    expect(await ui.find({ type: 'Text', text: /\/tally 48 lines/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /row 1/ })).toBeDefined()
    await ui.unmount()
  }
})

test('counts lines in Portuguese on request', async ($, on) => {
  bottom(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  const ui = await $.ui.mount({ ...output(many), surface: 'terminal' })

  expect(await ui.find({ type: 'Text', text: /48 linhas/ })).toBeDefined()
  await ui.unmount()
})

test('leaves a short output untouched', async ($, on) => {
  bottom(on)

  const ui = await $.ui.mount({ ...output('one\ntwo'), surface: 'terminal' })

  expect(await ui.find({ type: 'Text', text: /lines/ })).toBeUndefined()
  await ui.unmount()
})

const rows = (count: number) => Array.from({ length: count }, (_, i) => `row ${i + 1}`).join('\n')

test('starts counting at 20 lines', async ($, on) => {
  bottom(on)

  const short = await $.ui.mount({ ...output(rows(19)), surface: 'terminal' })
  expect(await short.find({ type: 'Text', text: /lines/ })).toBeUndefined()
  await short.unmount()

  const long = await $.ui.mount({ ...output(rows(20)), surface: 'terminal' })
  expect(await long.find({ type: 'Text', text: /^\/tally 20 lines$/ })).toBeDefined()
  await long.unmount()
})

test('counts a trailing newline as a line and names the command that ran', async ($, on) => {
  bottom(on)

  const ui = await $.ui.mount({ ...output(`${rows(24)}\n`), props: { command: 'gst', args: '', text: `${rows(24)}\n`, isErrored: false }, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /^\/gst 25 lines$/ })).toBeDefined()
  await ui.unmount()
})

test('heads an errored output too', async ($, on) => {
  bottom(on)

  const ui = await $.ui.mount({ ...output(many), props: { command: 'build', args: '', text: many, isErrored: true }, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /\/build 48 lines/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /row 1/ })).toBeDefined()
  await ui.unmount()
})

test('counts lines in Spanish when the hub is set to es', async ($, on) => {
  bottom(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  const ui = await $.ui.mount({ ...output(many), surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /\/tally 48 líneas/ })).toBeDefined()
  await ui.unmount()
})
