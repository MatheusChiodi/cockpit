import { expect, mock, test } from 'claude-code/testing'

const BAND = {
  plugin: 'files-band',
  component: 'AbovePrompt',
  props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 100, scroll: { offset: 0, bodyRows: 10 }, view: {} },
  viewport: { columns: 120, rows: 40 },
} as const

const START = { cwd: '/repo', surface: null, isInteractive: true } as const

const done = (exitCode: number, stdout = '') => ({
  value: { exitCode, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false },
})

// The hub's switch and language, plus the empty box the engine would draw with no mod.
const hub = (on: any, off: string[] = [], lang = 'en') => {
  on('session.start', (_: unknown, e: any) => ({ cwd: e.cwd }))
  on('state.get', { plugin: 'cockpit', key: 'off' }, () => ({ value: { value: off, version: 1 } }))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: lang, version: 1 } }))
  on('ui.render', { component: 'AbovePrompt' }, ($: any, e: any) => {
    const { Box } = $.ui.resolve(e)

    return <Box />
  })
}

const has = async (ui: any, text: RegExp) => (await ui.find({ type: 'Text', text })) !== undefined

const draw = async ($: any, surface: 'terminal' | 'desktop' = 'terminal') => {
  await $.session.start(START)

  return $.ui.mount({ ...BAND, surface })
}

const world = (on: any, off: string[] = [], lang = 'en') => {
  hub(on, off, lang)
  on('tool.call', { tool: 'Edit' }, (_: unknown, e: any) => (e.file_path.includes('bad') ? { deny: 'no' } : { result: {} as never }))
  on('tool.call', { tool: 'Write' }, (_: unknown, e: any) =>
    e.file_path.includes('broken') ? { result: {} as never, isError: true as const } : { result: {} as never },
  )
  on('tool.call', { tool: 'NotebookEdit' }, () => ({ result: {} as never }))
}

const edit = ($: any, file_path: string) =>
  $.tool.call({ tool: 'Edit', file_path, old_string: 'a', new_string: 'b', tool_use_id: `e-${file_path}` })

test('lists the files Claude changed, most recent first, by name', async ($, on) => {
  world(on)
  await edit($, String.raw`D:\work\src\a.ts`)
  await $.tool.call({ tool: 'Write', file_path: '/work/src/b.ts', content: 'x', tool_use_id: 'w-1' })
  await $.tool.call({ tool: 'NotebookEdit', notebook_path: '/work/n.ipynb', new_source: 'x', tool_use_id: 'n-1' })
  await edit($, '/work/src/a.ts')

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await draw($, surface)

    expect(await has(ui, /FILES/)).toBe(true)
    expect(await has(ui, /4 changed/)).toBe(true)
    expect(await has(ui, /a.ts {2}n.ipynb {2}b.ts {2}a.ts/)).toBe(true)
    await ui.unmount()
  }
})

test('counts a file once and shows at most four names', async ($, on) => {
  world(on)
  await edit($, '/w/a.ts')
  await edit($, '/w/a.ts')

  expect(await has(await draw($), /1 changed/)).toBe(true)

  for (const name of ['b', 'c', 'd', 'e', 'f']) {
    await edit($, `/w/${name}.ts`)
  }

  const ui = await draw($)
  expect(await has(ui, /6 changed/)).toBe(true)
  expect(await has(ui, /f\.ts {2}e\.ts {2}d\.ts {2}c\.ts/)).toBe(true)
  expect(await has(ui, /\+2/)).toBe(true)
})

test('ignores a denied edit and a failed write', async ($, on) => {
  world(on)
  await edit($, '/w/bad.ts')
  await $.tool.call({ tool: 'Write', file_path: '/w/broken.ts', content: 'x', tool_use_id: 'w-1' })

  expect(await has(await draw($), /FILES/)).toBe(false)
})

test('hides while the hub lists it as off', async ($, on) => {
  world(on, ['files-band'])
  await edit($, '/w/a.ts')
  expect(await has(await draw($), /FILES/)).toBe(false)
})

test('speaks the language set in the hub', async ($, on) => {
  world(on, [], 'pt')
  await edit($, '/w/a.ts')
  await edit($, '/w/b.ts')

  const ui = await draw($)
  expect(await has(ui, /ARQUIVOS/)).toBe(true)
  expect(await has(ui, /2 alterados/)).toBe(true)
})

test('hides while a survey is shown above the prompt', async ($, on) => {
  world(on)
  await edit($, '/w/a.ts')
  await $.session.start(START)

  const ui = await $.ui.mount({ ...BAND, props: { ...BAND.props, hasSurvey: true }, surface: 'terminal' })
  expect(await has(ui, /FILES/)).toBe(false)
})

test('passes the answer from beneath through unchanged', async ($, on) => {
  world(on)

  expect((await edit($, '/w/bad.ts')).deny).toBe('no')
  expect((await $.tool.call({ tool: 'Write', file_path: '/w/broken.ts', content: 'x', tool_use_id: 'w-2' })).isError).toBe(true)
})

test('remembers at most 200 files', async ($, on) => {
  world(on)

  for (let index = 0; index < 205; index += 1) {
    await edit($, `/w/f${index}.ts`)
  }

  const ui = await draw($)
  expect(await has(ui, /200 changed/)).toBe(true)
  expect(await has(ui, /f204\.ts {2}f203\.ts {2}f202\.ts {2}f201\.ts/)).toBe(true)
  expect(await has(ui, /\+196/)).toBe(true)
})

test('uses the singular in Portuguese for one file', async ($, on) => {
  world(on, [], 'pt')
  await edit($, '/w/a.ts')

  const ui = await draw($)
  expect(await has(ui, /1 alterado$/)).toBe(true)
})

test('speaks Spanish when the hub is set to es', async ($, on) => {
  world(on, [], 'es')
  await edit($, '/w/a.ts')
  expect(await has(await draw($), /1 modificado$/)).toBe(true)

  await edit($, '/w/b.ts')
  const ui = await draw($)
  expect(await has(ui, /ARCHIVOS/)).toBe(true)
  expect(await has(ui, /2 modificados/)).toBe(true)
})
