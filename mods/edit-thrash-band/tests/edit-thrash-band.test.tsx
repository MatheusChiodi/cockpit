import type { On } from 'claude-code'
import { expect, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

const PT = { value: { value: 'pt', version: 1 } } as const

const BAND = {
  plugin: 'edit-thrash-band',
  component: 'AbovePrompt',
  props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 100, scroll: { offset: 0, bodyRows: 10 }, view: {} },
  viewport: { columns: 120, rows: 40 },
} as const

const world = (on: On) => {
  on('turn.start', (_$, e) => ({ turnId: e.turnId }))
  on('tool.call', { tool: 'Edit' }, () => ({ result: {} }) as never)
  on('ui.render', { component: 'AbovePrompt' }, ($, e) => {
    const { Box } = $.ui.resolve(e)

    return <Box />
  })
}

let id = 0

const edit = ($: Engine, path: string, agentId?: string) =>
  $.tool.call({
    tool: 'Edit',
    file_path: path,
    old_string: 'a',
    new_string: 'b',
    tool_use_id: `e${(id += 1)}`,
    ...(agentId === undefined ? {} : { agentId }),
  })

test('appears on the third edit to the same file and counts further ones', async ($, on) => {
  world(on)
  await $.turn.start({ text: 'go', turnId: 't1' })
  await edit($, '/repo/src/Button.tsx')
  await edit($, '/repo/src/Button.tsx')
  await edit($, '/repo/src/other.ts')

  const quiet = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await quiet.find({ type: 'Text', text: /LOOP/ })).toBeUndefined()
  await quiet.unmount()

  await edit($, '/repo/src/Button.tsx')
  await edit($, '/repo/src/Button.tsx')

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })

    expect(await ui.find({ type: 'Text', text: /LOOP/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /Button\.tsx x4/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /edits to the same file this turn/ })).toBeDefined()
    await ui.unmount()
  }
})

test('starts over with the next turn and ignores subagents', async ($, on) => {
  world(on)
  await $.turn.start({ text: 'go', turnId: 't1' })

  for (let n = 0; n < 4; n += 1) {
    await edit($, '/repo/a.ts', 'sub')
  }

  const ignored = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ignored.find({ type: 'Text', text: /LOOP/ })).toBeUndefined()
  await ignored.unmount()

  for (let n = 0; n < 3; n += 1) {
    await edit($, '/repo/a.ts')
  }
  await $.turn.start({ text: 'again', turnId: 't2' })

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /LOOP/ })).toBeUndefined()
  await ui.unmount()
})

test('hides while the hub lists it as off', async ($, on) => {
  world(on)
  on('state.get', { plugin: 'cockpit', key: 'off' }, () => ({ value: { value: ['edit-thrash-band'], version: 1 } }))

  for (let n = 0; n < 3; n += 1) {
    await edit($, '/repo/a.ts')
  }

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /LOOP/ })).toBeUndefined()
  await ui.unmount()
})

test('speaks the language set in the hub', async ($, on) => {
  world(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => PT)

  for (let n = 0; n < 3; n += 1) {
    await edit($, '/repo/a.ts')
  }

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /LAÇO/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /edições no mesmo arquivo neste turno/ })).toBeDefined()
  await ui.unmount()
})

const write = ($: Engine, path: string) =>
  $.tool.call({ tool: 'Write', file_path: path, content: 'x', tool_use_id: `w${(id += 1)}` })

test('counts Write calls together with Edit calls on the same file', async ($, on) => {
  world(on)
  on('tool.call', { tool: 'Write' }, () => ({ result: {} }) as never)
  await $.turn.start({ text: 'go', turnId: 't1' })
  await edit($, '/repo/a.ts')
  await write($, '/repo/a.ts')
  await edit($, '/repo/a.ts')

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /a\.ts x3/ })).toBeDefined()
  await ui.unmount()
})

test('does not count edits that failed or were denied', async ($, on) => {
  let answer: object = { result: {}, isError: true }
  on('turn.start', (_$, e) => ({ turnId: e.turnId }))
  on('tool.call', { tool: 'Edit' }, () => answer as never)
  on('ui.render', { component: 'AbovePrompt' }, ($, e) => {
    const { Box } = $.ui.resolve(e)

    return <Box />
  })

  await $.turn.start({ text: 'go', turnId: 't1' })
  await edit($, '/repo/a.ts')
  await edit($, '/repo/a.ts')
  answer = { deny: 'blocked' }
  await edit($, '/repo/a.ts')
  answer = { result: {} }
  await edit($, '/repo/a.ts')

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /LOOP/ })).toBeUndefined()
  await ui.unmount()
})

test('shows the two files edited most, busiest first, by file name only', async ($, on) => {
  world(on)
  await $.turn.start({ text: 'go', turnId: 't1' })

  for (const [path, times] of [['/repo/low.ts', 3], [String.raw`C:\repo\top.ts`, 5], ['/repo/mid.ts', 4]] as const) {
    for (let n = 0; n < times; n += 1) {
      await edit($, path)
    }
  }

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  const drawn = JSON.stringify(await ui.drawn())
  expect(drawn.indexOf('top.ts')).toBeLessThan(drawn.indexOf('mid.ts'))
  expect(await ui.find({ type: 'Text', text: /low\.ts/ })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: /top\.ts x5/ })).toBeDefined()
  expect(drawn).not.toContain('/repo/')
  expect(drawn).not.toContain('C:')
  await ui.unmount()
})

test('hides while a survey is open', async ($, on) => {
  world(on)

  for (let n = 0; n < 3; n += 1) {
    await edit($, '/repo/a.ts')
  }

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal', props: { ...BAND.props, hasSurvey: true } })
  expect(await ui.find({ type: 'Text', text: /LOOP/ })).toBeUndefined()
  await ui.unmount()
})

test('speaks Spanish when the hub says so', async ($, on) => {
  world(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  for (let n = 0; n < 3; n += 1) {
    await edit($, '/repo/a.ts')
  }

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /BUCLE/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /ediciones al mismo archivo en este turno/ })).toBeDefined()
  await ui.unmount()
})
