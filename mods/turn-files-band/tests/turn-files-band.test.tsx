import type { On } from 'claude-code'
import { expect, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

const PT = { value: { value: 'pt', version: 1 } } as const

const BAND = {
  plugin: 'turn-files-band',
  component: 'AbovePrompt',
  props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 100, scroll: { offset: 0, bodyRows: 10 }, view: {} },
  viewport: { columns: 120, rows: 40 },
} as const

const ANSWER = { result: {} } as never

const world = (on: On) => {
  on('turn.start', (_$, e) => ({ turnId: e.turnId }))
  on('tool.call', { tool: 'Read' }, () => ANSWER)
  on('tool.call', { tool: 'Edit' }, () => ANSWER)
  on('tool.call', { tool: 'Write' }, () => ANSWER)
  on('ui.render', { component: 'AbovePrompt' }, ($, e) => {
    const { Box } = $.ui.resolve(e)

    return <Box />
  })
}

const read = ($: Engine, path: string, agentId?: string) =>
  $.tool.call({ tool: 'Read', file_path: path, tool_use_id: `r-${path}`, ...(agentId === undefined ? {} : { agentId }) })

const edit = ($: Engine, path: string) =>
  $.tool.call({ tool: 'Edit', file_path: path, old_string: 'a', new_string: 'b', tool_use_id: `e-${path}` })

test('counts the files read and edited in the turn, naming the edited ones', async ($, on) => {
  world(on)
  await $.turn.start({ text: 'go', turnId: 't1' })
  await read($, '/repo/src/a.ts')
  await read($, '/repo/src/b.ts')
  await read($, '/repo/src/c.ts')
  await edit($, '/repo/src/b.ts')
  await edit($, '/repo/src/b.ts')

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })

    expect(await ui.find({ type: 'Text', text: /TOUCHED/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /2 read/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /1 edited/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /b\.ts/ })).toBeDefined()
    await ui.unmount()
  }
})

test('starts over with the next turn and ignores subagents', async ($, on) => {
  world(on)
  await $.turn.start({ text: 'go', turnId: 't1' })
  await read($, '/repo/a.ts', 'sub')
  await read($, '/repo/b.ts')
  await $.turn.start({ text: 'again', turnId: 't2' })

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /TOUCHED/ })).toBeUndefined()
  await ui.unmount()

  await read($, '/repo/c.ts')
  const after = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await after.find({ type: 'Text', text: /1 read/ })).toBeDefined()
  await after.unmount()
})

test('hides while the hub lists it as off', async ($, on) => {
  world(on)
  on('state.get', { plugin: 'cockpit', key: 'off' }, () => ({ value: { value: ['turn-files-band'], version: 1 } }))
  await read($, '/repo/a.ts')

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /TOUCHED/ })).toBeUndefined()
  await ui.unmount()
})

test('speaks the language set in the hub', async ($, on) => {
  world(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => PT)
  await read($, '/repo/a.ts')

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /1 lidos/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /0 editados/ })).toBeDefined()
  await ui.unmount()
})

const write = ($: Engine, path: string) =>
  $.tool.call({ tool: 'Write', file_path: path, content: 'x', tool_use_id: `w-${path}` })

test('names only the last three edited files and counts the rest', async ($, on) => {
  world(on)
  for (const file of ['a', 'b', 'c', 'd', 'e']) {
    await write($, `/repo/${file}.ts`)
  }

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /5 edited/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /c\.ts {2}d\.ts {2}e\.ts {2}\+2/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /a\.ts/ })).toBeUndefined()
  await ui.unmount()
})

test('a file edited and then read stays counted as edited', async ($, on) => {
  world(on)
  await edit($, '/repo/a.ts')
  await read($, '/repo/a.ts')

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /0 read/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /1 edited/ })).toBeDefined()
  await ui.unmount()
})

test('does not count denied or failed edits', async ($, on) => {
  on('tool.call', { tool: 'Edit' }, () => ({ deny: 'no' }))
  on('tool.call', { tool: 'Write' }, () => ({ result: {}, isError: true }) as never)
  on('ui.render', { component: 'AbovePrompt' }, ($, e) => {
    const { Box } = $.ui.resolve(e)

    return <Box />
  })
  await edit($, '/repo/a.ts')
  await write($, '/repo/b.ts')

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /TOUCHED/ })).toBeUndefined()
  await ui.unmount()
})

test('hides while a survey is shown', async ($, on) => {
  world(on)
  await read($, '/repo/a.ts')

  const ui = await $.ui.mount({ ...BAND, props: { ...BAND.props, hasSurvey: true }, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /TOUCHED/ })).toBeUndefined()
  await ui.unmount()
})

test('speaks Spanish from the hub', async ($, on) => {
  world(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))
  await read($, '/repo/a.ts')

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /TOCADOS/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /1 leídos/ })).toBeDefined()
  await ui.unmount()
})
