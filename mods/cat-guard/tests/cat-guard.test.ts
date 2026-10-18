import { expect, test } from 'claude-code/testing'
import type { On } from 'claude-code'

const SIZES: Record<string, number> = {
  'logs/app.log': 8421 * 1024,
  'logs/small.log': 4 * 1024,
  'my logs/big one.log': 500 * 1024,
}

const ANSWER = { result: { stdout: '', stderr: '', interrupted: false } }

// The kit may anchor the path to a drive and flip its slashes: match on the plain form.
const world = (on: On) => {
  on('fs.stat', (_$, e) => {
    const plain = e.path.replace(/\\/g, '/')
    const known = Object.entries(SIZES).find(([name]) => plain.endsWith(`/${name}`) || plain === name)

    return { value: { kind: 'file' as const, size: known?.[1] ?? 0, mtimeMs: 0, isLink: false } }
  })
  on('tool.call', { tool: 'Bash' }, () => ANSWER)
}

test('refuses cat, type and Get-Content on a big file', async ($, on) => {
  world(on)

  const cat = await $.tool.call({ tool: 'Bash', command: 'cat logs/app.log', tool_use_id: 'c1' })
  expect(cat.deny).toBe('cat-guard: logs/app.log is 8421 KB. Read a slice with offset/limit, or use tail, head or Grep.')

  const type = await $.tool.call({ tool: 'Bash', command: 'type logs\\app.log', tool_use_id: 'c2' })
  expect(type.deny).toContain('is 8421 KB')

  const quoted = await $.tool.call({ tool: 'Bash', command: 'Get-Content "my logs/big one.log"', tool_use_id: 'c3' })
  expect(quoted.deny).toContain('is 500 KB')
})

test('lets small files, pipes, options and other commands through', async ($, on) => {
  world(on)

  for (const [at, command] of ['cat logs/small.log', 'cat logs/app.log | head -50', 'cat -n logs/app.log', 'tail -n 50 logs/app.log', 'cat missing.txt'].entries()) {
    const ran = await $.tool.call({ tool: 'Bash', command, tool_use_id: `k${at}` })
    expect(ran.deny).toBeUndefined()
  }
})

test('speaks the language set in the hub', async ($, on) => {
  world(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  const cat = await $.tool.call({ tool: 'Bash', command: 'cat logs/app.log', tool_use_id: 'p1' })
  expect(cat.deny).toContain('logs/app.log tem 8421 KB')
})

test('lets a directory, a file of exactly 100 KB and an unreadable path through', async ($, on) => {
  let answer: () => unknown = () => ({ value: { kind: 'dir', size: 9e9, mtimeMs: 0, isLink: false } })
  on('fs.stat', () => answer() as never)
  on('tool.call', { tool: 'Bash' }, () => ANSWER)

  expect((await $.tool.call({ tool: 'Bash', command: 'cat logs', tool_use_id: 'd1' })).deny).toBeUndefined()

  answer = () => ({ value: { kind: 'file', size: 100 * 1024, mtimeMs: 0, isLink: false } })
  expect((await $.tool.call({ tool: 'Bash', command: 'cat edge.log', tool_use_id: 'd2' })).deny).toBeUndefined()

  answer = () => {
    throw new Error('EACCES')
  }
  expect((await $.tool.call({ tool: 'Bash', command: 'cat secret.log', tool_use_id: 'd3' })).deny).toBeUndefined()
})

test('lets redirections and chained commands through', async ($, on) => {
  world(on)

  for (const [at, command] of ['cat logs/app.log > copy.log', 'cd x && cat logs/app.log', 'cat logs/app.log; echo done', 'cat logs/app.log logs/small.log'].entries()) {
    expect((await $.tool.call({ tool: 'Bash', command, tool_use_id: `r${at}` })).deny, command).toBeUndefined()
  }
})

test('reads single-quoted paths and the gc alias', async ($, on) => {
  world(on)

  expect((await $.tool.call({ tool: 'Bash', command: "cat 'my logs/big one.log'", tool_use_id: 'q1' })).deny).toContain('is 500 KB')
  expect((await $.tool.call({ tool: 'Bash', command: 'gc logs/app.log', tool_use_id: 'q2' })).deny).toContain('is 8421 KB')
})

test('speaks Spanish from the hub', async ($, on) => {
  world(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  const cat = await $.tool.call({ tool: 'Bash', command: 'cat logs/app.log', tool_use_id: 'es1' })
  expect(cat.deny).toBe('cat-guard: logs/app.log pesa 8421 KB. Lee un fragmento con offset/limit, o usa tail, head o Grep.')
})
