import type { On } from 'claude-code'
import { expect, test } from 'claude-code/testing'

const hint = (props: { isDraft: boolean; isWorking: boolean; tail?: string }) =>
  ({
    plugin: 'key-hints',
    component: 'PromptHint',
    props: { hint: '? for shortcuts', ...props },
    viewport: { columns: 120, rows: 40 },
  }) as const

// The engine's line: its hint and the tail it was handed.
const bottom = (on: On) =>
  on('ui.render', { component: 'PromptHint' }, ($, e) => {
    const { Text } = $.ui.resolve(e)

    return (
      <Text>
        {e.props.hint}
        {e.props.tail !== undefined && ` | ${e.props.tail}`}
      </Text>
    )
  })

test('adds the keys that matter to the state of the prompt, on terminal and desktop', async ($, on) => {
  bottom(on)

  for (const surface of ['terminal', 'desktop'] as const) {
    const idle = await $.ui.mount({ ...hint({ isDraft: false, isWorking: false }), surface })
    expect(await idle.find({ type: 'Text', text: /\? for shortcuts \| esc esc rewind/ })).toBeDefined()
    await idle.unmount()

    const draft = await $.ui.mount({ ...hint({ isDraft: true, isWorking: false }), surface })
    expect(await draft.find({ type: 'Text', text: /shift\+enter newline/ })).toBeDefined()
    await draft.unmount()

    const working = await $.ui.mount({ ...hint({ isDraft: false, isWorking: true }), surface })
    expect(await working.find({ type: 'Text', text: /ctrl\+b background/ })).toBeDefined()
    await working.unmount()
  }
})

test('appends to a tail another mod already set', async ($, on) => {
  bottom(on)

  const ui = await $.ui.mount({ ...hint({ isDraft: false, isWorking: true, tail: 'focus' }), surface: 'terminal' })

  expect(await ui.find({ type: 'Text', text: /focus {2}ctrl\+o transcript/ })).toBeDefined()
  await ui.unmount()
})

test('speaks Portuguese when the hub says so', async ($, on) => {
  bottom(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  const ui = await $.ui.mount({ ...hint({ isDraft: true, isWorking: false }), surface: 'terminal' })

  expect(await ui.find({ type: 'Text', text: /shift\+enter nova linha/ })).toBeDefined()
  await ui.unmount()
})

test('while working, the working keys win over a draft', async ($, on) => {
  bottom(on)

  const ui = await $.ui.mount({ ...hint({ isDraft: true, isWorking: true }), surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /ctrl\+o transcript {2}ctrl\+b background/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /shift\+enter/ })).toBeUndefined()
  await ui.unmount()
})

test('keeps the engine hint and adds exactly one tail', async ($, on) => {
  bottom(on)

  const ui = await $.ui.mount({ ...hint({ isDraft: false, isWorking: false }), surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /^\? for shortcuts \| esc esc rewind {2}ctrl\+r history$/ })).toBeDefined()
  await ui.unmount()
})

test('speaks Spanish in every state', async ($, on) => {
  bottom(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  const idle = await $.ui.mount({ ...hint({ isDraft: false, isWorking: false }), surface: 'terminal' })
  expect(await idle.find({ type: 'Text', text: /esc esc retroceder {2}ctrl\+r historial/ })).toBeDefined()
  await idle.unmount()

  const draft = await $.ui.mount({ ...hint({ isDraft: true, isWorking: false }), surface: 'terminal' })
  expect(await draft.find({ type: 'Text', text: /shift\+enter nueva línea/ })).toBeDefined()
  await draft.unmount()

  const working = await $.ui.mount({ ...hint({ isDraft: false, isWorking: true }), surface: 'terminal' })
  expect(await working.find({ type: 'Text', text: /ctrl\+b segundo plano/ })).toBeDefined()
  await working.unmount()
})

test('the Portuguese idle and working keys', async ($, on) => {
  bottom(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  const idle = await $.ui.mount({ ...hint({ isDraft: false, isWorking: false }), surface: 'terminal' })
  expect(await idle.find({ type: 'Text', text: /esc esc voltar {2}ctrl\+r histórico/ })).toBeDefined()
  await idle.unmount()

  const working = await $.ui.mount({ ...hint({ isDraft: false, isWorking: true }), surface: 'desktop' })
  expect(await working.find({ type: 'Text', text: /ctrl\+b segundo plano/ })).toBeDefined()
  await working.unmount()
})
