import { expect, test } from 'claude-code/testing'

const slashed = (path: string) => path.replaceAll('\\', '/')

const PACKAGE = JSON.stringify({
  name: 'web',
  dependencies: { react: '18', '@tanstack/react-query': '5' },
  devDependencies: { vitest: '1', '@types/node': '20' },
})

const TSCONFIG = `{
  // comments and trailing commas are legal here
  "compilerOptions": { "paths": { "@/*": ["./src/*"], }, },
}`

// A project at /work: package.json `manifest`, the tsconfig above and the node_modules folders in `installed`.
const project = (on: any, installed: string[] = [], manifest = PACKAGE) => {
  on('session.root', () => ({ value: '/work' }))
  on('fs.read', (_: unknown, e: { path: string }) => {
    const path = slashed(e.path)

    if (path.endsWith('/work/package.json')) {
      return { value: manifest }
    }

    return path.endsWith('/work/tsconfig.json') ? { value: TSCONFIG } : { deny: 'ENOENT' }
  })
  on('fs.exists', (_: unknown, e: { path: string }) => ({
    value: installed.some(name => slashed(e.path).endsWith(`/work/node_modules/${name}`)),
  }))
  on('tool.call', { tool: 'Write' }, () => ({ result: undefined as never }))
  on('tool.call', { tool: 'Edit' }, () => ({ result: undefined as never }))
}

const write = ($: any, content: string, file_path = '/work/src/api.ts') =>
  $.tool.call({ tool: 'Write', file_path, content, tool_use_id: `w-${content}` })

test('refuses importing a package that is neither declared nor installed', async ($, on) => {
  project(on)

  const answer = await write($, `import axios from 'axios'\nexport const get = axios.get`)
  expect(answer.deny).toContain('missing-import-guard: "axios" (imported in src/api.ts) is not in package.json or node_modules')

  const scoped = await write($, `const q = await import('@scope/pkg/deep')`)
  expect(scoped.deny).toContain('"@scope/pkg"')

  const edit = await $.tool.call({
    tool: 'Edit',
    file_path: '/work/src/api.ts',
    old_string: 'const a = 1',
    new_string: `const lodash = require('lodash/fp')`,
    tool_use_id: 'e1',
  })
  expect(edit.deny).toContain('"lodash"')
})

test('lets declared, built-in, relative, aliased and installed imports through', async ($, on) => {
  project(on, ['left-pad'])

  const code = [
    `import { useState } from 'react'`,
    `import { useQuery } from '@tanstack/react-query'`,
    `import { readFile } from 'node:fs/promises'`,
    `import path from 'path'`,
    `import x from './local'`,
    `import y from '@/lib/db'`,
    `import z from 'left-pad'`,
    `import { test } from 'vitest'`,
    `import 'web/setup'`,
  ].join('\n')

  expect((await write($, code)).deny).toBeUndefined()
})

test('judges only the imports an edit adds, in source files of the project', async ($, on) => {
  project(on)

  const kept = await $.tool.call({
    tool: 'Edit',
    file_path: '/work/src/api.ts',
    old_string: `import axios from 'axios'`,
    new_string: `import axios from 'axios' // typed`,
    tool_use_id: 'e2',
  })
  expect(kept.deny).toBeUndefined()

  expect((await write($, `import axios from 'axios'`, '/work/README.md')).deny).toBeUndefined()
  expect((await write($, `import axios from 'axios'`, '/other/src/api.ts')).deny).toBeUndefined()
})

test('stays silent in a workspaces monorepo', async ($, on) => {
  project(on, [], JSON.stringify({ workspaces: ['packages/*'] }))

  expect((await write($, `import axios from 'axios'`)).deny).toBeUndefined()
})

test('speaks the language set in the hub', async ($, on) => {
  project(on)
  // Stands in for the hub: answers the language it would hold.
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  const answer = await write($, `import axios from 'axios'`)
  expect(answer.deny).toContain('missing-import-guard: "axios" (importado em src/api.ts) não está no package.json nem no node_modules')
})
