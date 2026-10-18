import type { On } from 'claude-code'
import { expect, test } from 'claude-code/testing'

const modes = (list: string[]) =>
  ({
    plugin: 'mode-keys',
    component: 'SessionMode',
    props: { modes: list },
    viewport: { columns: 120, rows: 40 },
  }) as const

// The engine's footer: the labels joined by ` & `.
const bottom = (on: On) =>
  on('ui.render', { component: 'SessionMode' }, ($, e) => {
    const { Text } = $.ui.resolve(e)

    return <Text dimColor>{e.props.modes.join(' & ')}</Text>
  })

test('tells how to leave the mode shown, on terminal and desktop', async ($, on) => {
  bottom(on)

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...modes(['focus']), surface })

    expect(await ui.find({ type: 'Text', text: /focus & shift\+tab switches/ })).toBeDefined()
    await ui.unmount()
  }
})

test('speaks Portuguese when the hub says so', async ($, on) => {
  bottom(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  const ui = await $.ui.mount({ ...modes(['focus']), surface: 'terminal' })

  expect(await ui.find({ type: 'Text', text: /focus & shift\+tab alterna/ })).toBeDefined()
  await ui.unmount()
})

test('adds nothing when no mode is on', async ($, on) => {
  bottom(on)

  const ui = await $.ui.mount({ ...modes([]), surface: 'terminal' })

  expect(await ui.find({ type: 'Text', text: /shift\+tab/ })).toBeUndefined()
  await ui.unmount()
})

test('puts the key after every mode shown', async ($, on) => {
  bottom(on)

  const ui = await $.ui.mount({ ...modes(['plan', 'auto-accept']), surface: 'terminal' })

  expect(await ui.find({ type: 'Text', text: /^plan & auto-accept & shift\+tab switches$/ })).toBeDefined()
  await ui.unmount()
})

test('does not repeat the key when the list already holds it', async ($, on) => {
  bottom(on)

  const ui = await $.ui.mount({ ...modes(['shift+tab switches', 'focus']), surface: 'terminal' })

  expect(await ui.find({ type: 'Text', text: /^focus & shift\+tab switches$/ })).toBeDefined()
  await ui.unmount()
})

test('speaks Spanish when the hub says so', async ($, on) => {
  bottom(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...modes(['plan']), surface })

    expect(await ui.find({ type: 'Text', text: /^plan & shift\+tab cambia$/ })).toBeDefined()
    await ui.unmount()
  }
})
