import { expect, test } from 'claude-code/testing'

const slashed = (path: string) => path.replaceAll('\\', '/')

// A project at /work with `deps` and existing files by absolute path.
const project = (on: any, deps: string[], files: Record<string, string> = {}) => {
  on('session.root', () => ({ value: '/work' }))
  on('fs.read', (_: unknown, e: { path: string }) => {
    const path = slashed(e.path)

    if (path.endsWith('/work/package.json')) {
      return { value: JSON.stringify({ dependencies: Object.fromEntries(deps.map(name => [name, '1'])) }) }
    }

    const hit = Object.entries(files).find(([file]) => path.endsWith(file))

    return hit === undefined ? { deny: 'ENOENT' } : { value: hit[1] }
  })
  on('tool.call', { tool: 'Write' }, () => ({ result: undefined as never }))
  on('tool.call', { tool: 'Edit' }, () => ({ result: undefined as never }))
}

const write = ($: any, file_path: string, content: string) =>
  $.tool.call({ tool: 'Write', file_path, content, tool_use_id: `w-${file_path}-${content}` })

const COUNTER = `export default function Counter() {\n  const [n, setN] = useState(0)\n  return <button onClick={() => setN(n + 1)}>{n}</button>\n}`

test('refuses hooks and handlers in a file without use client', async ($, on) => {
  project(on, ['next'])

  const answer = await write($, '/work/app/cart/page.tsx', COUNTER)
  expect(answer.deny).toContain("next-boundary-guard: useState only works in a client component. Put 'use client' as the first line of app/cart/page.tsx")

  const handler = await write($, '/work/src/app/Button.tsx', `export default function B() { return <button onClick={go}>x</button> }`)
  expect(handler.deny).toContain('onClick only works in a client component')

  const error = await write($, '/work/app/error.tsx', `export default function Error() { return <p>oops</p> }`)
  expect(error.deny).toContain('an error boundary must be a client component')
})

test('lets client components, server components and non-component files through', async ($, on) => {
  project(on, ['next'])

  expect((await write($, '/work/app/cart/page.tsx', `'use client'\n${COUNTER}`)).deny).toBeUndefined()
  expect((await write($, '/work/app/page.tsx', `export default async function Home() { return <main /> }`)).deny).toBeUndefined()
  expect((await write($, '/work/app/hooks.ts', `export const useX = () => useState(0)`)).deny).toBeUndefined()
  expect((await write($, '/work/components/Counter.tsx', COUNTER)).deny).toBeUndefined()
})

test('refuses server-only code and async components under use client', async ($, on) => {
  project(on, ['next'])

  const headers = await write($, '/work/app/Nav.tsx', `'use client'\nimport { cookies } from 'next/headers'\nexport default function Nav() { return null }`)
  expect(headers.deny).toContain(`imports "next/headers", which only runs on the server`)

  const only = await write($, '/work/app/Db.tsx', `"use client"\nimport 'server-only'\nexport default function Db() { return null }`)
  expect(only.deny).toContain('"server-only"')

  const async = await write($, '/work/app/List.tsx', `'use client'\nexport default async function List() { return null }`)
  expect(async.deny).toContain('a client component cannot be async')
})

test('judges the file an edit produces and only what the edit adds', async ($, on) => {
  project(on, ['next'], { '/work/app/Nav.tsx': `export default function Nav() {\n  const x = 1\n  return null\n}` })

  const added = await $.tool.call({
    tool: 'Edit',
    file_path: '/work/app/Nav.tsx',
    old_string: 'const x = 1',
    new_string: 'const [x] = useState(1)',
    tool_use_id: 'e1',
  })
  expect(added.deny).toContain('useState only works in a client component')

  const fine = await $.tool.call({
    tool: 'Edit',
    file_path: '/work/app/Nav.tsx',
    old_string: 'const x = 1',
    new_string: 'const x = 2',
    tool_use_id: 'e2',
  })
  expect(fine.deny).toBeUndefined()
})

test('does nothing in a project without Next.js', async ($, on) => {
  project(on, ['react'])

  expect((await write($, '/work/app/cart/page.tsx', COUNTER)).deny).toBeUndefined()
})

test('speaks the language set in the hub', async ($, on) => {
  project(on, ['next'])
  // Stands in for the hub: answers the language it would hold.
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  const answer = await write($, '/work/app/cart/page.tsx', COUNTER)
  expect(answer.deny).toContain("next-boundary-guard: useState só funciona em componente cliente. Ponha 'use client' na primeira linha de app/cart/page.tsx")
})
