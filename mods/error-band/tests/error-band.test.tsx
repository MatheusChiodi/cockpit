import { expect, mock, test } from 'claude-code/testing'

const BAND = {
  plugin: 'error-band',
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

// The engine sets `text` (what the model reads) on a real call; the test sets it by hand.
const failed = (text: string) => ({ result: { stdout: text, stderr: '', interrupted: false }, text, isError: true as const })

const world = (on: any, off: string[] = [], lang = 'en') => {
  hub(on, off, lang)
  on('tool.call', { tool: 'Bash' }, (_: unknown, e: any) => {
    if (e.command === 'denied') {
      return { deny: 'blocked' }
    }

    if (e.command === 'silent fail') {
      return failed('')
    }

    return e.command.startsWith('fail')
      ? failed('compiling...' + String.fromCharCode(10) + 'Error: boom at line 3' + String.fromCharCode(10) + 'more')
      : { result: { stdout: 'fine', stderr: '', interrupted: false }, text: 'fine' }
  })
  on('tool.call', { tool: 'PowerShell' }, () => failed(['step one', 'step two'].join(String.fromCharCode(10))))
}

const bash = ($: any, command: string) => $.tool.call({ tool: 'Bash', command, tool_use_id: `b-${command}` })

test('shows the failed command and its error line, on terminal and desktop', async ($, on) => {
  world(on)
  await bash($, 'fail   npm  build')

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await draw($, surface)

    expect(await has(ui, /ERROR/)).toBe(true)
    expect(await has(ui, /✗ fail npm build/)).toBe(true)
    expect(await has(ui, /Error: boom at line 3/)).toBe(true)
    await ui.unmount()
  }
})

test('falls back to the last output line, and to a note when there is none', async ($, on) => {
  world(on)
  await $.tool.call({ tool: 'PowerShell', command: 'dotnet build', tool_use_id: 'p-1' })
  expect(await has(await draw($), /step two/)).toBe(true)

  await bash($, 'silent fail')
  expect(await has(await draw($), /no output/)).toBe(true)
})

test('a command that passes clears the error', async ($, on) => {
  world(on)
  await bash($, 'fail once')
  await bash($, 'ls')

  expect(await has(await draw($), /ERROR/)).toBe(false)
})

test('a blocked command changes nothing', async ($, on) => {
  world(on)
  await bash($, 'fail once')
  await bash($, 'denied')

  expect(await has(await draw($), /✗ fail once/)).toBe(true)
})

test('the dismiss button removes the band', async ($, on) => {
  world(on)
  await bash($, 'fail once')

  const ui = await draw($)
  expect(await has(ui, /ERROR/)).toBe(true)
  await ui.press({ key: 'dismiss' })
  expect(await has(ui, /ERROR/)).toBe(false)
  await ui.unmount()
})

test('hides while the hub lists it as off', async ($, on) => {
  world(on, ['error-band'])
  await bash($, 'fail once')
  expect(await has(await draw($), /ERROR/)).toBe(false)
})

test('speaks the language set in the hub', async ($, on) => {
  world(on, [], 'pt')
  await bash($, 'silent fail')

  const ui = await draw($)
  expect(await has(ui, /ERRO/)).toBe(true)
  expect(await has(ui, /sem saída/)).toBe(true)
})

test('cuts the command to 60 characters and the line to 160', async ($, on) => {
  hub(on)
  on('tool.call', { tool: 'Bash' }, () => failed(`fatal: ${'z'.repeat(300)}`))

  await bash($, `fail ${'c'.repeat(100)}`)

  const ui = await draw($)
  expect(await has(ui, new RegExp(`✗ fail ${'c'.repeat(55)}`))).toBe(true)
  expect(await has(ui, new RegExp('c'.repeat(56)))).toBe(false)
  expect(await has(ui, new RegExp(`fatal: ${'z'.repeat(153)}`))).toBe(true)
  expect(await has(ui, new RegExp('z'.repeat(154)))).toBe(false)
  await ui.unmount()
})

test('a newer failure takes the place of the older one', async ($, on) => {
  world(on)
  await bash($, 'fail first')
  await bash($, 'fail second')

  const ui = await draw($)
  expect(await has(ui, /✗ fail second/)).toBe(true)
  expect(await has(ui, /fail first/)).toBe(false)
  await ui.unmount()
})

test('keeps the band beneath and steps aside for a survey', async ($, on) => {
  on('session.start', (_: unknown, e: any) => ({ cwd: e.cwd }))
  on('ui.render', { component: 'AbovePrompt' }, ($: any, e: any) => {
    const { Text } = $.ui.resolve(e)

    return <Text>beneath</Text>
  })
  on('tool.call', { tool: 'Bash' }, () => failed('Error: x'))
  await bash($, 'fail once')
  await $.session.start(START)

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await has(ui, /beneath/)).toBe(true)
  expect(await has(ui, /ERROR/)).toBe(true)
  await ui.unmount()

  const survey = await $.ui.mount({ ...BAND, props: { ...BAND.props, hasSurvey: true }, surface: 'terminal' })
  expect(await has(survey, /beneath/)).toBe(true)
  expect(await has(survey, /ERROR/)).toBe(false)
  await survey.unmount()
})

test('speaks Spanish when the hub says so', async ($, on) => {
  world(on, [], 'es')
  await bash($, 'silent fail')

  const ui = await draw($)
  expect(await has(ui, /sin salida/)).toBe(true)
  expect(await ui.find({ type: 'Button', text: 'Descartar' })).toBeDefined()
  await ui.unmount()
})
