import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'

const message = (text: string, extra: Record<string, unknown> = {}) =>
  ({
    plugin: 'prompt-stamp',
    component: 'UserMessage',
    requestId: 'u1',
    props: { text, origin: { kind: 'composer' }, isExpanded: false, ...extra },
    viewport: { columns: 120, rows: 40 },
  }) as never

const bottom = (on: On) => {
  on('prompt.submit', (_$, e) => ({ text: e.text }))
  on('ui.render', { component: 'UserMessage' }, ($, e) => {
    const { Text } = $.ui.resolve(e)

    return <Text>&gt; {e.props.text}</Text>
  })
}

const noon = new Date(2026, 9, 13, 14, 5, 0).getTime()

test('stamps a typed prompt with its clock time, on terminal and desktop', async ($, on) => {
  mock.clock(on, { now: noon })
  bottom(on)
  await $.prompt.submit({ text: 'fix the login hook', wait: false, origin: { kind: 'composer' } })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...(message('fix the login hook') as object), surface } as never)

    expect(await ui.find({ type: 'Text', text: /fix the login hook/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /14:05/ })).toBeDefined()
    await ui.unmount()
  }
})

test('names the sender of a message from another agent, in Portuguese on request', async ($, on) => {
  mock.clock(on)
  bottom(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  const ui = await $.ui.mount({
    ...(message('found 3 callers', { origin: { kind: 'peer' }, from: { name: 'explorer' } }) as object),
    surface: 'terminal',
  } as never)

  expect(await ui.find({ type: 'Text', text: /de explorer/ })).toBeDefined()
  await ui.unmount()
})

test('leaves unknown prompts and expanded rows untouched', async ($, on) => {
  mock.clock(on, { now: noon })
  bottom(on)
  await $.prompt.submit({ text: 'typed', wait: false, origin: { kind: 'composer' } })

  const other = await $.ui.mount({ ...(message('never typed') as object), surface: 'terminal' } as never)
  expect(await other.find({ type: 'Text', text: /\d\d:\d\d/ })).toBeUndefined()
  await other.unmount()

  const open = await $.ui.mount({ ...(message('typed', { isExpanded: true }) as object), surface: 'terminal' } as never)
  expect(await open.find({ type: 'Text', text: /\d\d:\d\d/ })).toBeUndefined()
  await open.unmount()
})

test('does not stamp a prompt that was dropped beneath', async ($, on) => {
  mock.clock(on, { now: noon })
  on('prompt.submit', () => ({ drop: 'blocked' }))
  on('ui.render', { component: 'UserMessage' }, ($, e) => {
    const { Text } = $.ui.resolve(e)

    return <Text>&gt; {e.props.text}</Text>
  })

  await $.prompt.submit({ text: 'secret prompt', wait: false, origin: { kind: 'composer' } })

  const ui = await $.ui.mount({ ...(message('secret prompt') as object), surface: 'terminal' } as never)
  expect(await ui.find({ type: 'Text', text: /\d\d:\d\d/ })).toBeUndefined()
  await ui.unmount()
})

test('does not stamp a prompt that did not come from the composer', async ($, on) => {
  mock.clock(on, { now: noon })
  bottom(on)

  await $.prompt.submit({ text: 'from the sdk', wait: false, origin: { kind: 'sdk' } })

  const ui = await $.ui.mount({ ...(message('from the sdk') as object), surface: 'terminal' } as never)
  expect(await ui.find({ type: 'Text', text: /\d\d:\d\d/ })).toBeUndefined()
  await ui.unmount()
})

test('a prompt typed twice shows the time of the latest one', async ($, on) => {
  const clock = mock.clock(on, { now: noon })
  bottom(on)

  await $.prompt.submit({ text: 'run the tests', wait: false, origin: { kind: 'composer' } })
  await clock.advance(42 * 60000)
  await $.prompt.submit({ text: 'run the tests', wait: false, origin: { kind: 'composer' } })

  const ui = await $.ui.mount({ ...(message('run the tests') as object), surface: 'terminal' } as never)
  expect(await ui.find({ type: 'Text', text: /14:47/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /14:05/ })).toBeUndefined()
  await ui.unmount()
})

test('names the sender in English and Spanish', async ($, on) => {
  mock.clock(on)
  bottom(on)
  let lang = 'en'
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: lang, version: 1 } }) as never)

  const peer = { ...(message('done', { origin: { kind: 'peer' }, from: { name: 'reviewer' } }) as object), surface: 'terminal' }

  let ui = await $.ui.mount(peer as never)
  expect(await ui.find({ type: 'Text', text: /from reviewer/ })).toBeDefined()
  await ui.unmount()

  lang = 'es'
  ui = await $.ui.mount(peer as never)
  expect(await ui.find({ type: 'Text', text: /de reviewer/ })).toBeDefined()
  await ui.unmount()
})

test('uses a 24-hour clock in every language', async ($, on) => {
  mock.clock(on, { now: new Date(2026, 9, 13, 21, 9, 0).getTime() })
  bottom(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  await $.prompt.submit({ text: 'late one', wait: false, origin: { kind: 'composer' } })

  const ui = await $.ui.mount({ ...(message('late one') as object), surface: 'terminal' } as never)
  expect(await ui.find({ type: 'Text', text: /21:09/ })).toBeDefined()
  await ui.unmount()
})
