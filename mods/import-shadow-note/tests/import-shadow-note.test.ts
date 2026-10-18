import { expect, test } from 'claude-code/testing'

const slashed = (path: string) => path.replaceAll('\\', '/')

let counter = 0

// A project at /work with `files` by path; returns the toasts the person saw.
const project = (on: any, files: Record<string, string> = {}) => {
  const toasts: string[] = []
  on('session.root', () => ({ value: '/work' }))
  on('fs.read', (_: unknown, e: { path: string }) => {
    const path = slashed(e.path)
    const hit = Object.entries(files).find(([file]) => path.endsWith(file))

    return hit === undefined ? { deny: 'ENOENT' } : { value: hit[1] }
  })
  on('tool.call', { tool: 'Write' }, () => ({ result: undefined as never }))
  on('tool.call', { tool: 'Edit' }, () => ({ result: undefined as never }))
  on('ui.toast', (_: unknown, e: { text: string }) => {
    toasts.push(e.text)

    return { value: undefined }
  })

  return toasts
}

const write = ($: any, file_path: string, content: string) =>
  $.tool.call({ tool: 'Write', file_path, content, tool_use_id: `w${(counter += 1)}` })

const edit = ($: any, file_path: string, old_string: string, new_string: string) =>
  $.tool.call({ tool: 'Edit', file_path, old_string, new_string, tool_use_id: `e${(counter += 1)}` })

const FLAGGED: readonly [string, string, string][] = [
  [
    "/work/src/a.ts",
    "import { format } from 'date-fns'\n\nexport function show(d: Date) {\n  const format = 'long'\n  return d\n}\n",
    "format"
  ],
  [
    "/work/src/a.ts",
    "import * as path from 'node:path'\nlet path = ''\n",
    "path"
  ],
  [
    "/work/src/a.ts",
    "import axios, { get as fetchIt } from 'axios'\nfunction fetchIt() {}\n",
    "fetchIt"
  ]
]

const FINE: readonly [string, string][] = [
  [
    "/work/src/a.ts",
    "import { format } from 'date-fns'\nconst formatted = format(new Date())\nconst out = { format: 1 }\nconst o = out.format\n"
  ],
  [
    "/work/src/a.ts",
    "import { format } from 'date-fns'\nconst { format: fmt } = options\nconst Format = 1\n"
  ],
  [
    "/work/src/a.ts",
    "import { format as fmt } from 'date-fns'\nconst format = fmt(new Date())\n"
  ],
  [
    "/work/src/a.ts",
    "import { format } from 'date-fns'\nconst note = 'const format = 1'\n// const format = 2\n"
  ],
  [
    "/work/src/a.ts",
    "const format = 1\nfunction show() { return format }\n"
  ],
  [
    "/work/notes.md",
    "import { format } from 'date-fns'\nconst format = 1\n"
  ]
]

test('tells Claude what the edit added and shows a toast', async ($, on) => {
  const toasts = project(on)

  for (const [file, content, detail] of FLAGGED) {
    const answer = await write($, file, content)
    expect(answer.context?.[0], detail).toContain(detail)
    expect(answer.context?.[0], detail).toContain('import-shadow-note: ')
  }

  expect(toasts).toHaveLength(FLAGGED.length)
  expect(toasts[0]).toBe("import-shadow-note: format shadows an import in src/a.ts, Claude was told")
})

test('stays silent for look-alikes and files it does not read', async ($, on) => {
  const toasts = project(on)

  for (const [file, content] of FINE) {
    const answer = await write($, file, content)
    expect(answer.context, content).toBeUndefined()
  }

  expect(toasts).toEqual([])
})

test('ignores tests, fixtures, vendored and generated paths', async ($, on) => {
  const toasts = project(on)
  const [file, content] = FLAGGED[0] ?? ['', '']
  const ext = file.slice(file.lastIndexOf('.'))

  for (const skipped of [`/work/src/a.test${ext}`, `/work/tests/a${ext}`, `/work/node_modules/x/a${ext}`, `/work/dist/a${ext}`, `/work/src/a.generated${ext}`]) {
    expect((await write($, skipped, content)).context, skipped).toBeUndefined()
  }

  expect(toasts).toEqual([])
})

test('judges only what an Edit adds', async ($, on) => {
  const toasts = project(on, {
    "/work/src/a.ts": "import { format } from 'date-fns'\nexport const show = () => format(new Date())\n",
    "/work/src/b.ts": "import { format } from 'date-fns'\nlet format = 0\nconst n = 1\n",
  })

  const added = await edit($, "/work/src/a.ts", "export const show", "let format = 0\nexport const show")
  expect(added.context?.[0]).toContain("format")
  expect(toasts).toHaveLength(1)

  const kept = await edit($, "/work/src/b.ts", "const n = 1", "const n = 2")
  expect(kept.context).toBeUndefined()
  expect(toasts).toHaveLength(1)
})

test('leaves an Edit alone when the file cannot be read', async ($, on) => {
  const toasts = project(on)

  const answer = await edit($, "/work/src/a.ts", "export const show", "let format = 0\nexport const show")
  expect(answer.context).toBeUndefined()
  expect(toasts).toEqual([])
})

test('speaks the language set in the hub', async ($, on) => {
  const toasts = project(on)
  // Stands in for the hub: answers the language it would hold.
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  await write($, FLAGGED[0]?.[0] ?? '', FLAGGED[0]?.[1] ?? '')
  expect(toasts[0]).toBe("import-shadow-note: format esconde um import em src/a.ts, o Claude foi avisado")
})

test('catches a default import shadowed by a class and lists every name in the note', async ($, on) => {
  project(on)

  const answer = await write(
    $,
    '/work/src/b.tsx',
    "import React from 'react'\nimport { useState, type FC } from 'react'\nclass React {}\nconst useState = 1\n",
  )
  expect(answer.context?.[0]).toContain('src/b.tsx now declares a name that is also imported: React, useState.')
  expect(answer.context?.[0]).toContain('alias the import (import { x as libX })')
})

test('ignores declarations inside strings and template literals', async ($, on) => {
  const toasts = project(on)

  const answer = await write($, '/work/src/c.ts', "import { x } from 'lib'\nconst a = `\nconst x = 1\n`\n/* let x = 2 */\n")
  expect(answer.context).toBeUndefined()
  expect(toasts).toEqual([])
})

test('skips declaration files and stories', async ($, on) => {
  const toasts = project(on)
  const content = "import { format } from 'date-fns'\nconst format = 1\n"

  for (const file of ['/work/src/types.d.ts', '/work/src/Button.stories.tsx', '/work/src/__mocks__/a.ts']) {
    expect((await write($, file, content)).context, file).toBeUndefined()
  }

  expect(toasts).toEqual([])
})

test('says nothing about a write that was refused beneath', async ($, on) => {
  const toasts: string[] = []
  on('session.root', () => ({ value: '/work' }))
  on('fs.read', () => ({ deny: 'ENOENT' }))
  on('tool.call', { tool: 'Write' }, () => ({ deny: 'not allowed' }))
  on('ui.toast', (_: unknown, e: { text: string }) => {
    toasts.push(e.text)

    return { value: undefined }
  })

  const answer = await write($, '/work/src/a.ts', "import { format } from 'date-fns'\nconst format = 1\n")
  expect(answer.deny).toBe('not allowed')
  expect(toasts).toEqual([])
})

test('an Edit with replace_all judges the whole replaced file', async ($, on) => {
  project(on, { '/work/src/d.ts': "import { cn } from './cn'\nHOLE\nHOLE\n" })

  const answer = await $.tool.call({
    tool: 'Edit',
    file_path: '/work/src/d.ts',
    old_string: 'HOLE',
    new_string: 'let cn = 0',
    replace_all: true,
    tool_use_id: 'e-all',
  })
  expect(answer.context?.[0]).toContain('imported: cn.')
})

test('shows a Windows path relative to the project root', async ($, on) => {
  const toasts: string[] = []
  on('session.root', () => ({ value: 'C:\\Work' }))
  on('fs.read', () => ({ deny: 'ENOENT' }))
  on('tool.call', { tool: 'Write' }, () => ({ result: undefined as never }))
  on('ui.toast', (_: unknown, e: { text: string }) => {
    toasts.push(e.text)

    return { value: undefined }
  })

  await write($, 'C:\\Work\\src\\e.ts', "import { format } from 'date-fns'\nconst format = 1\n")
  expect(toasts).toEqual(['import-shadow-note: format shadows an import in src/e.ts, Claude was told'])
})

test('speaks Spanish when the hub language is es', async ($, on) => {
  const toasts = project(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  const answer = await write($, FLAGGED[0]?.[0] ?? '', FLAGGED[0]?.[1] ?? '')
  expect(toasts[0]).toBe('import-shadow-note: format oculta un import en src/a.ts, se avisó a Claude')
  expect(answer.context?.[0]).toContain('now declares a name that is also imported')
})
