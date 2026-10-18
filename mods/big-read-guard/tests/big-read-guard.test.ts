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

const sized = (size: number, kind: 'file' | 'dir' = 'file') => ({ value: { kind, size, mtimeMs: 0, isLink: false } })

const read = ($: any, file_path: string, extra: Record<string, unknown> = {}) =>
  $.tool.call({ tool: 'Read', file_path, tool_use_id: `r-${file_path}-${JSON.stringify(extra)}`, ...extra })

test('draws the line at 512 KB', async ($, on) => {
  let size = 512 * 1024
  on('fs.stat', () => sized(size))
  on('tool.call', { tool: 'Read' }, () => ANSWER)

  expect((await read($, 'data.json')).deny).toBeUndefined()

  size += 1
  expect((await read($, 'data.json')).deny).toBe('big-read-guard: data.json is 512 KB. Read a slice with offset/limit or search with Grep.')
})

test('an offset alone is not a slice, but pages are', async ($, on) => {
  on('fs.stat', () => sized(2048 * 1024))
  on('tool.call', { tool: 'Read' }, () => ANSWER)

  expect((await read($, 'dump.sql', { offset: 100 })).deny).toContain('dump.sql is 2048 KB')
  expect((await read($, 'manual.log', { pages: '1-3' })).deny).toBeUndefined()
})

test('lets folders, other images and files it cannot stat through', async ($, on) => {
  let answer: any = sized(9000 * 1024, 'dir')
  on('fs.stat', () => answer)
  on('tool.call', { tool: 'Read' }, () => ANSWER)

  expect((await read($, 'node_modules')).deny).toBeUndefined()

  answer = sized(9000 * 1024)
  for (const file of ['a.JPG', 'b.jpeg', 'c.gif', 'd.webp', 'e.PDF']) {
    expect((await read($, file)).deny, file).toBeUndefined()
  }

  answer = { deny: 'ENOENT' }
  expect((await read($, 'missing.log')).deny).toBeUndefined()
})

test('never runs a refused read', async ($, on) => {
  let ran = 0
  on('fs.stat', () => sized(4096 * 1024))
  on('tool.call', { tool: 'Read' }, () => {
    ran += 1

    return ANSWER
  })

  await read($, 'big.csv')
  expect(ran).toBe(0)
})

test('speaks Spanish when the hub is set to es', async ($, on) => {
  on('fs.stat', () => sized(1024 * 1024))
  on('tool.call', { tool: 'Read' }, () => ANSWER)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  expect((await read($, 'big.csv')).deny).toBe('big-read-guard: big.csv pesa 1024 KB. Lee un fragmento con offset/limit o busca con Grep.')
})
