import { expect, test } from 'claude-code/testing'

const slashed = (path: string) => path.replaceAll('\\', '/')

// A project at /work whose package.json is `manifest`.
const project = (on: any, manifest: object) => {
  on('session.root', () => ({ value: '/work' }))
  on('fs.read', (_: unknown, e: { path: string }) =>
    slashed(e.path).endsWith('/work/package.json') ? { value: JSON.stringify(manifest) } : { deny: 'ENOENT' },
  )
  on('tool.call', { tool: 'Write' }, () => ({ result: undefined as never }))
  on('tool.call', { tool: 'Edit' }, () => ({ result: undefined as never }))
}

const write = ($: any, file_path: string, content: string) =>
  $.tool.call({ tool: 'Write', file_path, content, tool_use_id: `w-${file_path}-${content}` })

test('refuses CommonJS in a .js file of an ES module package', async ($, on) => {
  project(on, { type: 'module' })

  const req = await write($, '/work/scripts/build.js', `const fs = require('fs')`)
  expect(req.deny).toContain('esm-guard: package.json is "type": "module", so scripts/build.js cannot use require()')

  const exp = await write($, '/work/lib/util.mjs', `module.exports = { a: 1 }`)
  expect(exp.deny).toContain('cannot use module.exports')

  const dir = await write($, '/work/lib/util.js', `const here = __dirname`)
  expect(dir.deny).toContain('__dirname does not exist in ES modules (lib/util.js)')

  const edit = await $.tool.call({
    tool: 'Edit',
    file_path: '/work/lib/util.js',
    old_string: 'x',
    new_string: `exports.a = 1`,
    tool_use_id: 'e1',
  })
  expect(edit.deny).toContain('cannot use module.exports')
})

test('lets ES syntax, comments, createRequire, TypeScript and .cjs through', async ($, on) => {
  project(on, { type: 'module' })

  expect((await write($, '/work/a.js', `import fs from 'node:fs'\nexport default fs`)).deny).toBeUndefined()
  expect((await write($, '/work/a.js', `// was: require('fs')\n/* module.exports = 1 */\nexport const a = 1`)).deny).toBeUndefined()
  expect((await write($, '/work/a.js', `import { createRequire } from 'node:module'\nconst require = createRequire(import.meta.url)\nrequire('x')`)).deny).toBeUndefined()
  expect((await write($, '/work/a.cjs', `module.exports = 1`)).deny).toBeUndefined()
  expect((await write($, '/work/a.ts', `const x = require('x')`)).deny).toBeUndefined()
  expect((await write($, '/work/node_modules/x/a.js', `module.exports = 1`)).deny).toBeUndefined()
})

test('judges only what an edit adds', async ($, on) => {
  project(on, { type: 'module' })

  const kept = await $.tool.call({
    tool: 'Edit',
    file_path: '/work/a.js',
    old_string: `const a = require('a')`,
    new_string: `const a = require('a') // keep`,
    tool_use_id: 'e2',
  })
  expect(kept.deny).toBeUndefined()
})

test('does nothing in a CommonJS package', async ($, on) => {
  project(on, { name: 'x' })

  expect((await write($, '/work/a.js', `const fs = require('fs')`)).deny).toBeUndefined()
})

test('speaks the language set in the hub', async ($, on) => {
  project(on, { type: 'module' })
  // Stands in for the hub: answers the language it would hold.
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  const answer = await write($, '/work/scripts/build.js', `const fs = require('fs')`)
  expect(answer.deny).toContain('esm-guard: o package.json é "type": "module", então scripts/build.js não pode usar require()')
})

test('refuses __filename and an exports assignment, and names them', async ($, on) => {
  project(on, { type: 'module' })

  const file = await write($, '/work/src/a.jsx', `console.log(__filename)`)
  expect(file.deny).toBe(
    'esm-guard: __filename does not exist in ES modules (src/a.jsx). Use import.meta.dirname, or fileURLToPath(import.meta.url) before Node 20.11.',
  )

  const exp = await write($, '/work/src/b.js', `exports.run = () => 1`)
  expect(exp.deny).toContain('src/b.js cannot use module.exports')
})

test('lets files outside the project and look-alike names through', async ($, on) => {
  project(on, { type: 'module' })

  expect((await write($, '/elsewhere/a.js', `module.exports = 1`)).deny).toBeUndefined()
  expect((await write($, '/work/a.js', `const x = obj.require('y')\nconst d = my__dirname`)).deny).toBeUndefined()
  expect((await write($, '/work/a.js', `const url = 'http://example.com' // module.exports`)).deny).toBeUndefined()
})

test('a Write that keeps CommonJS already in the file is not refused', async ($, on) => {
  on('session.root', () => ({ value: '/work' }))
  on('fs.read', (_: unknown, e: { path: string }) =>
    slashed(e.path).endsWith('/work/package.json')
      ? { value: JSON.stringify({ type: 'module' }) }
      : { value: `const fs = require('fs')\n` },
  )
  on('tool.call', { tool: 'Write' }, () => ({ result: undefined as never }))

  const kept = await write($, '/work/old.js', `const fs = require('fs')\nfs.readFileSync('x')\n`)
  expect(kept.deny).toBeUndefined()
})

test('a package.json that is not valid JSON counts as CommonJS', async ($, on) => {
  on('session.root', () => ({ value: '/work' }))
  on('fs.read', () => ({ value: '{ not json' }))
  on('tool.call', { tool: 'Write' }, () => ({ result: undefined as never }))

  expect((await write($, '/work/a.js', `module.exports = 1`)).deny).toBeUndefined()
})

test('matches the project root regardless of slashes and case', async ($, on) => {
  on('session.root', () => ({ value: 'C:\\Work' }))
  on('fs.read', (_: unknown, e: { path: string }) =>
    slashed(e.path).endsWith('/package.json') ? { value: JSON.stringify({ type: 'module' }) } : { deny: 'ENOENT' },
  )
  on('tool.call', { tool: 'Write' }, () => ({ result: undefined as never }))

  const answer = await write($, 'c:\\work\\lib\\x.mjs', `module.exports = 1`)
  expect(answer.deny).toContain('so lib/x.mjs cannot use module.exports')
})

test('speaks Spanish when the hub language is es', async ($, on) => {
  project(on, { type: 'module' })
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  const answer = await write($, '/work/x.js', `module.exports = {}`)
  expect(answer.deny).toBe(
    'esm-guard: package.json es "type": "module", así que x.js no puede usar module.exports. Usa export / export default.',
  )
})
