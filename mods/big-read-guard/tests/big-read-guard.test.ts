import { expect, test } from 'claude-code/testing'

const SIZES: Record<string, number> = {
  'logs/app.log': 8421 * 1024,
  'logs/small.log': 4 * 1024,
  'assets/photo.png': 9000 * 1024,
}

const ANSWER = { result: undefined as never }

// The kit may anchor the path to a drive and flip its slashes: match on the plain form.
const stat = (path: string) => {
  const plain = path.replace(/\\/g, '/')
  const known = Object.entries(SIZES).find(([name]) => plain.endsWith(`/${name}`) || plain === name)

  return { value: { kind: 'file' as const, size: known?.[1] ?? 0, mtimeMs: 0, isLink: false } }
}

test('refuses reading a huge file whole and lets slices and small files through', async ($, on) => {
  on('fs.stat', ($, e) => stat(e.path))
  on('tool.call', { tool: 'Read' }, () => ANSWER)

  const big = await $.tool.call({ tool: 'Read', file_path: 'logs/app.log', tool_use_id: 'r1' })
  expect(big.deny).toContain('app.log is 8421 KB. Read a slice with offset/limit or search with Grep.')

  const slice = await $.tool.call({ tool: 'Read', file_path: 'logs/app.log', limit: 200, tool_use_id: 'r2' })
  expect(slice.deny).toBeUndefined()

  const small = await $.tool.call({ tool: 'Read', file_path: 'logs/small.log', tool_use_id: 'r3' })
  expect(small.deny).toBeUndefined()

  const image = await $.tool.call({ tool: 'Read', file_path: 'assets/photo.png', tool_use_id: 'r4' })
  expect(image.deny).toBeUndefined()
})

test('speaks the language set in the hub', async ($, on) => {
  on('fs.stat', ($, e) => stat(e.path))
  on('tool.call', { tool: 'Read' }, () => ANSWER)
  // Stands in for the hub: answers the language it would hold.
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  const big = await $.tool.call({ tool: 'Read', file_path: 'logs/app.log', tool_use_id: 'pt-1' })
  expect(big.deny).toContain('app.log tem 8421 KB')
})
