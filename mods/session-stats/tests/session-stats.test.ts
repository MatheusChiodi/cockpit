import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'

const PT = { value: { value: 'pt', version: 1 } } as const

const STATS = {
  command: 'stats',
  args: '',
  origin: { kind: 'composer' } as const,
  presentation: { isFullscreen: true, columns: 120 },
}

const ANSWER = { result: { stdout: '', stderr: '', interrupted: false } }

const COMPLETE = {
  text: 'ok',
  reason: 'answer',
  answer: 'ok',
  durationMs: 1000,
  isAborted: false,
  turnId: 't1',
  usage: { input_tokens: 1, output_tokens: 1500, cache_read_input_tokens: 0, cache_creation_input_tokens: 0, model: 'm' },
} as const

const world = (on: On, hasCost = true) => {
  const cost = hasCost ? { usd: 1.234 } : undefined
  on('turn.complete', () => ({ text: 'ok' }))
  mock.clock(on, { now: 90 * 60000 })
  on('session.usage', () => ({
    value: { startedAt: 0, context: { window: 200000, percent: 42, tokens: 84000 }, rateLimits: [], cost },
  }))
  on('session.turns', () => ({ value: 3 }))
  on('session.model', () => ({ value: 'claude-test' }))
  on('session.cwd', () => ({ value: '/work/app' }))
}

test('summarises the session: time, prompts, tools, tokens, context and cost', async ($, on) => {
  world(on)
  on('tool.call', { tool: 'Bash' }, () => ANSWER)
  on('tool.call', { tool: 'Read' }, () => ({ deny: 'no' }))

  await $.tool.call({ tool: 'Bash', command: 'ls', tool_use_id: 'a' })
  await $.tool.call({ tool: 'Read', file_path: '/x', tool_use_id: 'b' })
  await $.turn.complete(COMPLETE)
  await $.turn.complete(COMPLETE)

  const text = (await $.command.run(STATS)).text ?? ''
  expect(text).toContain('Session     1h30 in /work/app')
  expect(text).toContain('Model       claude-test')
  expect(text).toContain('Prompts     3')
  expect(text).toContain('Tools       2 (1 failed or blocked)')
  expect(text).toContain('Output      3,000 tokens')
  expect(text).toContain('Context     42% of 200,000 tokens')
  expect(text).toContain('Cost        $1.23')
})

test('shows zeros and n/a on a fresh session without cost', async ($, on) => {
  world(on, false)

  const text = (await $.command.run(STATS)).text ?? ''
  expect(text).toContain('Tools       0 (0 failed or blocked)')
  expect(text).toContain('Output      0 tokens')
  expect(text).toContain('Cost        n/a')
})

test('speaks the language set in the hub', async ($, on) => {
  world(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => PT)

  const text = (await $.command.run(STATS)).text ?? ''
  expect(text).toContain('Sessão      1h30 em /work/app')
  expect(text).toContain('Contexto    42% de 200.000 tokens')
  expect(text).toContain('Custo       US$ 1.23')
})
