import type { On } from 'claude-code'
import { expect, test } from 'claude-code/testing'

const PT = { value: { value: 'pt', version: 1 } } as const

const BAND = {
  plugin: 'gate-band',
  component: 'AbovePrompt',
  props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 100, scroll: { offset: 0, bodyRows: 10 }, view: {} },
  viewport: { columns: 120, rows: 40 },
} as const

// The world beneath the mod: rm is refused, everything else is allowed, git push asks.
const world = (on: On) => {
  on('turn.start', (_$, e) => ({ turnId: e.turnId }))
  on('tool.call', { tool: 'Bash' }, (_$, e) =>
    e.command.startsWith('rm') ? { deny: 'blocked the command' } : ({ result: {} } as never),
  )
  on('tool.check', (_$, e) => ({ decision: (e.input as { command?: string }).command === 'git push' ? 'ask' : 'allow' }))
  on('ui.render', { component: 'AbovePrompt' }, ($, e) => {
    const { Box } = $.ui.resolve(e)

    return <Box />
  })
}

const bash = (command: string, id: string) => ({ tool: 'Bash', command, tool_use_id: id }) as const

test('counts the denied and the asked calls of the turn and shows the last one', async ($, on) => {
  world(on)
  await $.turn.start({ text: 'go', turnId: 't1' })
  await $.tool.call(bash('rm -rf x', 'a'))
  await $.tool.call(bash('ls', 'b'))
  await $.tool.check({ tool: 'Bash', input: { command: 'git push' }, tool_use_id: 'c' })
  await $.tool.check({ tool: 'Bash', input: { command: 'git push' }, tool_use_id: 'd' })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })

    expect(await ui.find({ type: 'Text', text: /GATE/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /1 denied/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /2 asked/ })).toBeDefined()
    await ui.unmount()
  }
})

test('draws nothing while the turn has nothing refused, and starts over with the next turn', async ($, on) => {
  world(on)
  await $.turn.start({ text: 'go', turnId: 't1' })
  await $.tool.call(bash('ls', 'a'))
  await $.tool.check({ tool: 'Bash', input: { command: 'git push' } })

  const quiet = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await quiet.find({ type: 'Text', text: /GATE/ })).toBeUndefined()
  await quiet.unmount()

  await $.tool.call(bash('rm -rf y', 'b'))
  await $.turn.start({ text: 'again', turnId: 't2' })

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /GATE/ })).toBeUndefined()
  await ui.unmount()
})

test('hides while the hub lists it as off', async ($, on) => {
  world(on)
  on('state.get', { plugin: 'cockpit', key: 'off' }, () => ({ value: { value: ['gate-band'], version: 1 } }))
  await $.tool.call(bash('rm -rf x', 'a'))

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /GATE/ })).toBeUndefined()
  await ui.unmount()
})

test('speaks the language set in the hub', async ($, on) => {
  world(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => PT)
  await $.tool.call(bash('rm -rf x', 'a'))

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /1 negadas/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /neste turno/ })).toBeDefined()
  await ui.unmount()
})

test('speaks Spanish when the hub says so', async ($, on) => {
  world(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))
  await $.tool.call(bash('rm -rf x', 'a'))
  await $.tool.check({ tool: 'Bash', input: { command: 'git push' }, tool_use_id: 'c' })

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /PUERTA/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /1 denegadas/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /1 preguntadas/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /en este turno/ })).toBeDefined()
  await ui.unmount()
})

test('shows the tool and reason of the last refusal, whitespace folded and cut to 80', async ($, on) => {
  on('tool.call', { tool: 'Bash' }, () => ({ deny: `first\n\n  reason ${'x'.repeat(100)}` }))
  on('ui.render', { component: 'AbovePrompt' }, ($, e) => {
    const { Box } = $.ui.resolve(e)

    return <Box />
  })
  await $.tool.call(bash('one', 'a'))

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: new RegExp(`Bash: first reason x{${80 - 'first reason '.length}}$`) })).toBeDefined()
  await ui.unmount()
})

test('counts only asks, without a denied field, when nothing was refused', async ($, on) => {
  on('tool.check', () => ({ decision: 'ask', reason: 'needs approval' }))
  on('ui.render', { component: 'AbovePrompt' }, ($, e) => {
    const { Box } = $.ui.resolve(e)

    return <Box />
  })
  await $.tool.check({ tool: 'Bash', input: { command: 'deploy' }, tool_use_id: 'c' })

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /1 asked/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /denied/ })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: /Bash: needs approval/ })).toBeDefined()
  await ui.unmount()
})

test('leaves out what subagents were refused or asked', async ($, on) => {
  world(on)
  await $.tool.call({ ...bash('rm -rf x', 'a'), ...{ agentId: 'agent-1' } })
  await $.tool.check({ tool: 'Bash', input: { command: 'git push' }, tool_use_id: 'c', agentId: 'agent-1' })

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /GATE/ })).toBeUndefined()
  await ui.unmount()
})

test('hides while a survey is open', async ($, on) => {
  world(on)
  await $.tool.call(bash('rm -rf x', 'a'))

  const ui = await $.ui.mount({ ...BAND, props: { ...BAND.props, hasSurvey: true }, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /GATE/ })).toBeUndefined()
  await ui.unmount()
})
