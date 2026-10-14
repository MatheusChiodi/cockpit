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
