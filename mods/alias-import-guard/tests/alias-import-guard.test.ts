import { expect, test } from 'claude-code/testing'

const slashed = (path: string) => path.replaceAll('\\', '/')

const TSCONFIG = `{
  // aliases of the project
  "compilerOptions": { "baseUrl": ".", "paths": { "@/*": ["src/*"], "@ui/*": ["./src/components/ui/*"], }, },
}`

// A project at /work whose tsconfig.json is `tsconfig` (none when undefined).
const project = (on: any, tsconfig: string | null = TSCONFIG) => {
  on('session.root', () => ({ value: '/work' }))
  on('fs.read', (_: unknown, e: { path: string }) =>
    tsconfig !== null && slashed(e.path).endsWith('/work/tsconfig.json') ? { value: tsconfig } : { deny: 'ENOENT' },
  )
  on('tool.call', { tool: 'Write' }, () => ({ result: undefined as never }))
  on('tool.call', { tool: 'Edit' }, () => ({ result: undefined as never }))
}

const write = ($: any, file_path: string, content: string) =>
  $.tool.call({ tool: 'Write', file_path, content, tool_use_id: `w-${file_path}-${content}` })

test('refuses a deep relative import and names the alias to use', async ($, on) => {
  project(on)

  const lib = await write($, '/work/src/features/cart/ui/Cart.tsx', `import { db } from '../../../lib/db'`)
  expect(lib.deny).toContain('alias-import-guard: "../../../lib/db" climbs 3 folders in src/features/cart/ui/Cart.tsx')
  expect(lib.deny).toContain('tsconfig paths has "@/*": import "@/lib/db" instead.')

  const ui = await write($, '/work/src/features/cart/ui/Cart.tsx', `import { Button } from '../../../components/ui/button'`)
  expect(ui.deny).toContain('"@ui/*": import "@ui/button" instead.')

  const edit = await $.tool.call({
    tool: 'Edit',
    file_path: '/work/src/a/b/c/d.ts',
    old_string: 'x',
    new_string: `const m = await import('../../../util/x')`,
    tool_use_id: 'e1',
  })
  expect(edit.deny).toContain('import "@/util/x"')
})

test('lets short, aliased, outside and already present imports through', async ($, on) => {
  project(on)

  expect((await write($, '/work/src/a/b/c.ts', `import x from '../../x'\nimport y from './y'\nimport z from '@/z'`)).deny).toBeUndefined()
  // Climbs out of every aliased folder: no alias to offer.
  expect((await write($, '/work/src/a/b.ts', `import x from '../../../shared/x'`)).deny).toBeUndefined()
  expect((await write($, '/work/README.md', `import x from '../../../x'`)).deny).toBeUndefined()

  const kept = await $.tool.call({
    tool: 'Edit',
    file_path: '/work/src/a/b/c/d.ts',
    old_string: `from '../../../x'`,
    new_string: `from '../../../x' // kept`,
    tool_use_id: 'e2',
  })
  expect(kept.deny).toBeUndefined()
})

test('does nothing without tsconfig paths', async ($, on) => {
  project(on, null)
  expect((await write($, '/work/src/a/b/c/d.ts', `import x from '../../../x'`)).deny).toBeUndefined()
})

test('does nothing when the config has no paths', async ($, on) => {
  project(on, `{ "compilerOptions": { "strict": true } }`)
  expect((await write($, '/work/src/a/b/c/d.ts', `import x from '../../../x'`)).deny).toBeUndefined()
})

test('speaks the language set in the hub', async ($, on) => {
  project(on)
  // Stands in for the hub: answers the language it would hold.
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  const answer = await write($, '/work/src/a/b/c/d.ts', `import x from '../../../lib/x'`)
  expect(answer.deny).toContain('alias-import-guard: "../../../lib/x" sobe 3 pastas em src/a/b/c/d.ts. O paths do tsconfig tem "@/*": importe "@/lib/x".')
})

test('reads jsconfig.json when tsconfig.json has no paths, and resolves against baseUrl', async ($, on) => {
  on('session.root', () => ({ value: '/work' }))
  on('fs.read', (_: unknown, e: { path: string }) => {
    const path = slashed(e.path)

    if (path.endsWith('/work/tsconfig.json')) {
      return { value: '{ "compilerOptions": {} }' }
    }

    return path.endsWith('/work/jsconfig.json')
      ? { value: '{ "compilerOptions": { "baseUrl": "src", "paths": { "#lib/*": ["lib/*"] } } }' }
      : { deny: 'ENOENT' }
  })
  on('tool.call', { tool: 'Write' }, () => ({ result: undefined as never }))

  const answer = await write($, '/work/src/a/b/c/d.js', `const x = require('../../../lib/x')`)
  expect(answer.deny).toContain('"#lib/*": import "#lib/x" instead.')
})

test('picks the most specific alias for the target', async ($, on) => {
  project(on)

  const answer = await write($, '/work/src/a/b/c.tsx', `export * from '../../../src/components/ui/card'`.replace('../../../src/', '../../'))
  expect(answer.deny).toBeUndefined()

  const deep = await write($, '/work/src/a/b/c/d.tsx', `export { Card } from '../../../components/ui/card'`)
  expect(deep.deny).toContain('"@ui/*": import "@ui/card" instead.')
})

test('leaves files outside the project root alone', async ($, on) => {
  project(on)
  expect((await write($, '/elsewhere/src/a/b/c/d.ts', `import x from '../../../lib/x'`)).deny).toBeUndefined()
})

test('ignores an unreadable config', async ($, on) => {
  project(on, '{ "compilerOptions": { "paths": ')
  expect((await write($, '/work/src/a/b/c/d.ts', `import x from '../../../lib/x'`)).deny).toBeUndefined()
})

test('fails closed with a clear reason when the check throws', async ($, on) => {
  let ran = 0
  on('session.root', () => ({ deny: 'no root' }))
  on('tool.call', { tool: 'Edit' }, () => {
    ran += 1

    return { result: undefined as never }
  })

  const answer = await $.tool.call({ tool: 'Edit', file_path: '/work/src/a.ts', old_string: 'a', new_string: 'b', tool_use_id: 'e-fail' })
  expect(answer.deny).toContain('alias-import-guard: the check failed')
  expect(ran).toBe(0)
})

test('speaks Spanish when the hub is set to es', async ($, on) => {
  project(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  const answer = await write($, '/work/src/a/b/c/d.ts', `import x from '../../../lib/x'`)
  expect(answer.deny).toContain('sube 3 carpetas en src/a/b/c/d.ts. El paths de tsconfig tiene "@/*": importa "@/lib/x".')
})
