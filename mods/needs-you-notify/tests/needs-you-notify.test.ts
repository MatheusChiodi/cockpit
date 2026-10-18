import { expect, test } from 'claude-code/testing'

const SENT = { value: { isSent: true, channel: 'terminal_bell' } } as const

test('notifies when a permission decision comes back ask, once per call', async ($, on) => {
  const sent: string[] = []
  on('tool.check', () => ({ decision: 'ask' }))
  on('ui.notify', (_, e) => {
    sent.push(e.text)

    return SENT
  })

  await $.tool.check({ tool: 'Bash', input: { command: 'npm publish' }, tool_use_id: 'c-1' })
  await $.tool.check({ tool: 'Bash', input: { command: 'npm publish' }, tool_use_id: 'c-1' })
  expect(sent).toEqual(['Claude needs your permission to run Bash.'])
})

test('stays quiet on allow, deny, queries and subagents', async ($, on) => {
  const sent: string[] = []
  let verdict: 'allow' | 'deny' | 'ask' = 'allow'
  on('tool.check', () => ({ decision: verdict }))
  on('ui.notify', (_, e) => {
    sent.push(e.text)

    return SENT
  })

  await $.tool.check({ tool: 'Read', input: {}, tool_use_id: 'q-1' })
  verdict = 'deny'
  await $.tool.check({ tool: 'Bash', input: {}, tool_use_id: 'q-2' })
  verdict = 'ask'
  await $.tool.check({ tool: 'Bash', input: {} })
  await $.tool.check({ tool: 'Bash', input: {}, tool_use_id: 'q-3', agentId: 'agent-1' })
  expect(sent).toEqual([])
})

test('notifies when Claude asks a question, in the hub language', async ($, on) => {
  const sent: string[] = []
  on('tool.call', { tool: 'AskUserQuestion' }, () => ({ result: { answers: {} } }))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))
  on('ui.notify', (_, e) => {
    sent.push(e.text)

    return SENT
  })

  await $.tool.call({ tool: 'AskUserQuestion', questions: [], tool_use_id: 'ask-1' })
  expect(sent).toEqual(['O Claude tem uma pergunta para você.'])
})

test('the notification carries the Claude Code title', async ($, on) => {
  const titles: (string | undefined)[] = []
  on('tool.check', () => ({ decision: 'ask' }))
  on('ui.notify', (_, e) => {
    titles.push(e.title)

    return SENT
  })

  await $.tool.check({ tool: 'Edit', input: {}, tool_use_id: 't-1' })
  expect(titles).toEqual(['Claude Code'])
})

test('a question is notified once, by the call and not by its permission check', async ($, on) => {
  const sent: string[] = []
  on('tool.check', () => ({ decision: 'ask' }))
  on('tool.call', { tool: 'AskUserQuestion' }, () => ({ result: { answers: {} } }) as never)
  on('ui.notify', (_, e) => {
    sent.push(e.text)

    return SENT
  })

  await $.tool.check({ tool: 'AskUserQuestion', input: {}, tool_use_id: 'ask-1' })
  await $.tool.call({ tool: 'AskUserQuestion', questions: [], tool_use_id: 'ask-1' } as never)
  await $.tool.call({ tool: 'AskUserQuestion', questions: [], tool_use_id: 'ask-1' } as never)
  expect(sent).toEqual(['Claude has a question for you.'])
})

test('a subagent question does not notify', async ($, on) => {
  const sent: string[] = []
  on('tool.call', { tool: 'AskUserQuestion' }, () => ({ result: { answers: {} } }) as never)
  on('ui.notify', (_, e) => {
    sent.push(e.text)

    return SENT
  })

  await $.tool.call({ tool: 'AskUserQuestion', questions: [], tool_use_id: 'ask-2', agentId: 'sub' } as never)
  expect(sent).toEqual([])
})

test('a failing notification does not change the verdict', async ($, on) => {
  on('tool.check', () => ({ decision: 'ask', reason: 'beneath' }))
  on('ui.notify', () => {
    throw new Error('no notifier')
  })

  expect(await $.tool.check({ tool: 'Bash', input: {}, tool_use_id: 'f-1' })).toEqual({ decision: 'ask', reason: 'beneath' })
})

test('speaks Spanish from the hub', async ($, on) => {
  const sent: string[] = []
  on('tool.check', () => ({ decision: 'ask' }))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))
  on('ui.notify', (_, e) => {
    sent.push(e.text)

    return SENT
  })

  await $.tool.check({ tool: 'WebFetch', input: {}, tool_use_id: 'es-1' })
  expect(sent).toEqual(['Claude necesita tu permiso para usar WebFetch.'])
})
