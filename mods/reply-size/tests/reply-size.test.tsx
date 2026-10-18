import type { On } from 'claude-code'
import { expect, test } from 'claude-code/testing'

const block = (text: string, extra: Record<string, unknown> = {}) =>
  ({
    plugin: 'reply-size',
    component: 'AssistantMessage',
    requestId: 'a1',
    props: { text, isFirstOfReply: true, ...extra },
    viewport: { columns: 120, rows: 40 },
  }) as never

const bottom = (on: On) =>
  on('ui.render', { component: 'AssistantMessage' }, ($, e) => {
    const { Text } = $.ui.resolve(e)

    return <Text>{e.props.text.slice(0, 20)}</Text>
  })

const long = `${'word '.repeat(200)}\n\`\`\`ts\nconst a = 1\n\`\`\`\n`

test('sizes a long block with its words and code blocks, on terminal and desktop', async ($, on) => {
  bottom(on)

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...(block(long) as object), surface } as never)

    expect(await ui.find({ type: 'Text', text: /206 words/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /1 code block/ })).toBeDefined()
    await ui.unmount()
  }
})

test('says the size in Portuguese on request', async ($, on) => {
  bottom(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  const ui = await $.ui.mount({ ...(block(long) as object), surface: 'terminal' } as never)

  expect(await ui.find({ type: 'Text', text: /206 palavras/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /1 bloco de código/ })).toBeDefined()
  await ui.unmount()
})

test('leaves a short block and a summary untouched', async ($, on) => {
  bottom(on)

  const short = await $.ui.mount({ ...(block('Done.') as object), surface: 'terminal' } as never)
  expect(await short.find({ type: 'Text', text: /words/ })).toBeUndefined()
  await short.unmount()

  const summary = await $.ui.mount({ ...(block(long, { isSummary: true }) as object), surface: 'terminal' } as never)
  expect(await summary.find({ type: 'Text', text: /words/ })).toBeUndefined()
  await summary.unmount()
})

const words = (count: number) => Array.from({ length: count }, (_, at) => `w${at}`).join(' ')

test('starts sizing at exactly 150 words', async ($, on) => {
  bottom(on)

  const below = await $.ui.mount({ ...(block(words(149)) as object), surface: 'terminal' } as never)
  expect(await below.find({ type: 'Text', text: /words/ })).toBeUndefined()
  await below.unmount()

  const at = await $.ui.mount({ ...(block(words(150)) as object), surface: 'terminal' } as never)
  expect(await at.find({ type: 'Text', text: /150 words/ })).toBeDefined()
  expect(await at.find({ type: 'Text', text: /code block/ })).toBeUndefined()
  await at.unmount()
})

test('counts closed fences only and pluralizes the blocks', async ($, on) => {
  bottom(on)
  const fence = '```'
  const two = `${words(160)}\n${fence}\na\n${fence}\n  ${fence}sh\nb\n  ${fence}\n${fence}\nunclosed\n`

  const ui = await $.ui.mount({ ...(block(two) as object), surface: 'terminal' } as never)
  expect(await ui.find({ type: 'Text', text: /2 code blocks/ })).toBeDefined()
  await ui.unmount()
})

test('keeps the drawing beneath above the size line', async ($, on) => {
  bottom(on)

  const ui = await $.ui.mount({ ...(block(long) as object), surface: 'terminal' } as never)
  const drawn = JSON.stringify(await ui.drawn())
  expect(drawn.indexOf('word word word')).toBeGreaterThanOrEqual(0)
  expect(drawn.indexOf('word word word')).toBeLessThan(drawn.indexOf('206 words'))
  await ui.unmount()
})

test('says the size in Spanish on request', async ($, on) => {
  bottom(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))
  const fence = '```'

  const ui = await $.ui.mount({ ...(block(`${words(200)}\n${fence}\nx\n${fence}\n${fence}\ny\n${fence}\n`) as object), surface: 'terminal' } as never)
  expect(await ui.find({ type: 'Text', text: /\d+ palabras/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /2 bloques de código/ })).toBeDefined()
  await ui.unmount()
})
