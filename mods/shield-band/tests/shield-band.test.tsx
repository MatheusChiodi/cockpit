import { expect, test } from 'claude-code/testing'
import type { On } from 'claude-code'

const BAND = {
  plugin: 'shield-band',
  component: 'AbovePrompt',
  props: {
    hasSurvey: false,
    isWorking: false,
    maxRows: 10,
    bodyColumns: 100,
    scroll: { offset: 0, bodyRows: 10 },
    view: {},
  },
  viewport: { columns: 120, rows: 40 },
} as const

const ANSWER = { result: { stdout: '', stderr: '', interrupted: false } }

// The world beneath the mod: a guard that refuses `rm` and lets the rest through, and the empty box the engine would draw.
const world = (on: On) => {
  on('tool.call', { tool: 'Bash' }, (_$, e) => (e.command.startsWith('rm') ? { deny: 'rm-guard blocked the command' } : ANSWER))
  on('ui.render', { component: 'AbovePrompt' }, ($, e) => {
    const { Box } = $.ui.resolve(e)

    return <Box />
  })
}

const bash = (id: string, command: string) => ({ tool: 'Bash', command, tool_use_id: id }) as const

test('counts the calls a guard refused and shows the last reason', async ($, on) => {
  world(on)

  await $.tool.call(bash('b1', 'rm -rf /'))
  await $.tool.call(bash('b2', 'ls'))
  await $.tool.call(bash('b3', 'rm -rf ~'))

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })

    expect(await ui.find({ type: 'Text', text: /GUARDS/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /2 blocks/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /Bash: rm-guard blocked the command/ })).toBeDefined()
    await ui.unmount()
  }
})

test('says "1 block" in the singular', async ($, on) => {
  world(on)
  await $.tool.call(bash('b4', 'rm x'))

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /1 block(?!s)/ })).toBeDefined()
  await ui.unmount()
})

test('draws nothing while every call is let through', async ($, on) => {
  world(on)
  await $.tool.call(bash('b5', 'ls'))

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /GUARDS/ })).toBeUndefined()
  await ui.unmount()
})

test('hides while the hub lists it as off', async ($, on) => {
  world(on)
  on('state.get', { plugin: 'cockpit', key: 'off' }, () => ({ value: { value: ['shield-band'], version: 1 } }))
  await $.tool.call(bash('b6', 'rm x'))

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /GUARDS/ })).toBeUndefined()
  await ui.unmount()
})

test('speaks the language set in the hub', async ($, on) => {
  world(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))
  await $.tool.call(bash('b7', 'rm x'))
  await $.tool.call(bash('b8', 'rm y'))

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /2 bloqueios/ })).toBeDefined()
  await ui.unmount()
})

test('collapses and cuts the reason, and shows the tool of the latest block', async ($, on) => {
  world(on)
  on('tool.call', { tool: 'PowerShell' }, () => ({ deny: `ps-guard   said\n${'n'.repeat(120)}` }))

  await $.tool.call(bash('b9', 'rm x'))
  await $.tool.call({ tool: 'PowerShell', command: 'Remove-Item C:\\', tool_use_id: 'p1' })

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /2 blocks/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: new RegExp(`PowerShell: ps-guard said ${'n'.repeat(76)}`) })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: new RegExp('n'.repeat(77)) })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: /Bash: rm-guard/ })).toBeUndefined()
  await ui.unmount()
})

test('keeps the band beneath and steps aside for a survey', async ($, on) => {
  on('tool.call', { tool: 'Bash' }, () => ({ deny: 'nope' }))
  on('ui.render', { component: 'AbovePrompt' }, ($, e) => {
    const { Text } = $.ui.resolve(e)

    return <Text>beneath</Text>
  })
  await $.tool.call(bash('b10', 'rm x'))

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /beneath/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /GUARDS/ })).toBeDefined()
  await ui.unmount()

  const survey = await $.ui.mount({ ...BAND, props: { ...BAND.props, hasSurvey: true }, surface: 'terminal' })
  expect(await survey.find({ type: 'Text', text: /beneath/ })).toBeDefined()
  expect(await survey.find({ type: 'Text', text: /GUARDS/ })).toBeUndefined()
  await survey.unmount()
})

test('speaks Spanish when the hub says so', async ($, on) => {
  world(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))
  await $.tool.call(bash('b11', 'rm x'))

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /1 bloqueo(?!s)/ })).toBeDefined()
  await ui.unmount()

  await $.tool.call(bash('b12', 'rm y'))
  const two = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await two.find({ type: 'Text', text: /2 bloqueos/ })).toBeDefined()
  await two.unmount()
})
