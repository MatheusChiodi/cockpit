import { expect, test } from 'claude-code/testing'
import type { On } from 'claude-code'

const SIZES: Record<string, number> = {
  'dist/bundle.js': 312 * 1024,
  'src/small.ts': 4 * 1024,
  'docs/book.pdf': 900 * 1024,
}

// The world beneath the mod: file sizes, a Read that records the limit it got, and the toasts.
const world = (on: On) => {
  const limits: (number | undefined)[] = []
  const toasts: string[] = []
  on('fs.stat', (_$, e) => {
    const plain = e.path.replace(/\\/g, '/')
    const known = Object.entries(SIZES).find(([name]) => plain.endsWith(`/${name}`) || plain === name)

    return { value: { kind: 'file' as const, size: known?.[1] ?? 0, mtimeMs: 0, isLink: false } }
  })
  on('tool.call', { tool: 'Read' }, (_$, e) => {
    limits.push(e.limit)

    return { result: undefined as never }
  })
  on('ui.toast', (_$, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })

  return { limits, toasts }
}

test('reads the first 600 lines of a big file and tells Claude how to continue', async ($, on) => {
  const { limits, toasts } = world(on)

  const ran = await $.tool.call({ tool: 'Read', file_path: 'dist/bundle.js', tool_use_id: 'r1' })

  expect(limits).toEqual([600])
  expect(ran.context?.[0]).toContain('only its first 600 lines were read. Continue with offset 600')
  expect(toasts).toEqual(['read-cap: dist/bundle.js (312 KB) read up to line 600 only'])
})

test('leaves small files, slices, allow_large and PDFs alone', async ($, on) => {
  const { limits, toasts } = world(on)

  await $.tool.call({ tool: 'Read', file_path: 'src/small.ts', tool_use_id: 'a1' })
  await $.tool.call({ tool: 'Read', file_path: 'dist/bundle.js', offset: 600, tool_use_id: 'a2' })
  await $.tool.call({ tool: 'Read', file_path: 'dist/bundle.js', limit: 50, tool_use_id: 'a3' })
  await $.tool.call({ tool: 'Read', file_path: 'dist/bundle.js', allow_large: true, tool_use_id: 'a4' })
  await $.tool.call({ tool: 'Read', file_path: 'docs/book.pdf', tool_use_id: 'a5' })

  expect(limits).toEqual([undefined, undefined, 50, undefined, undefined])
  expect(toasts).toEqual([])
})

test('speaks the language set in the hub', async ($, on) => {
  const { toasts } = world(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  await $.tool.call({ tool: 'Read', file_path: 'dist/bundle.js', tool_use_id: 'p1' })

  expect(toasts[0]).toBe('read-cap: dist/bundle.js (312 KB) lido só até a linha 600')
})
