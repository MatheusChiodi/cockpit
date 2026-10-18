import { expect, test } from 'claude-code/testing'

const slashed = (path: string) => path.replaceAll('\\', '/')

// A project at /work with `deps`, extra project `files` by absolute path, and the vite config text (if any).
const project = (on: any, deps: string[], files: Record<string, string> = {}, viteConfig?: string) => {
  on('session.root', () => ({ value: '/work' }))
  on('fs.read', (_: unknown, e: { path: string }) => {
    const path = slashed(e.path)

    if (path.endsWith('/work/package.json')) {
      return { value: JSON.stringify({ dependencies: Object.fromEntries(deps.map(name => [name, '1'])) }) }
    }

    if (viteConfig !== undefined && path.endsWith('/work/vite.config.ts')) {
      return { value: viteConfig }
    }

    const hit = Object.entries(files).find(([file]) => path.endsWith(file))

    return hit === undefined ? { deny: 'ENOENT' } : { value: hit[1] }
  })
  on('tool.call', { tool: 'Write' }, () => ({ result: undefined as never }))
  on('tool.call', { tool: 'Edit' }, () => ({ result: undefined as never }))
}

const write = ($: any, file_path: string, content: string) =>
  $.tool.call({ tool: 'Write', file_path, content, tool_use_id: `w-${file_path}-${content}` })

test('Vite: refuses an unprefixed import.meta.env and process.env in browser code', async ($, on) => {
  project(on, ['vite'])

  const hidden = await write($, '/work/src/api.ts', 'const url = import.meta.env.API_URL')
  expect(hidden.deny).toContain('client-env-guard: Vite hides API_URL from the browser (src/api.ts). Rename it VITE_API_URL')

  const process = await write($, '/work/src/api.ts', 'const url = process.env.API_URL')
  expect(process.deny).toContain('Vite does not define process.env in the browser')
  expect(process.deny).toContain('import.meta.env.VITE_API_URL')
})

test('Vite: lets exposed and built-in variables, config files and server folders through', async ($, on) => {
  project(on, ['vite'])

  expect((await write($, '/work/src/api.ts', 'const a = import.meta.env.VITE_API_URL + import.meta.env.MODE + process.env.NODE_ENV')).deny).toBeUndefined()
  expect((await write($, '/work/vite.config.ts', 'const a = process.env.API_URL')).deny).toBeUndefined()
  expect((await write($, '/work/src/server/db.ts', 'const a = process.env.DATABASE_URL')).deny).toBeUndefined()
  expect((await write($, '/work/scripts/seed.ts', 'const a = process.env.DATABASE_URL')).deny).toBeUndefined()
})

test('Vite: a custom envPrefix is left alone', async ($, on) => {
  project(on, ['vite'], {}, `export default { envPrefix: ['APP_'] }`)

  expect((await write($, '/work/src/api.ts', 'const url = import.meta.env.APP_URL')).deny).toBeUndefined()
})

test('Next.js: refuses an unprefixed variable in a client component only', async ($, on) => {
  project(on, ['next'])

  const client = await write($, '/work/app/Pay.tsx', `'use client'\nconst key = process.env.STRIPE_KEY`)
  expect(client.deny).toContain('STRIPE_KEY is undefined in the browser (app/Pay.tsx is a client component)')
  expect(client.deny).toContain('NEXT_PUBLIC_STRIPE_KEY')

  expect((await write($, '/work/app/Pay.tsx', `'use client'\nconst key = process.env.NEXT_PUBLIC_STRIPE_KEY`)).deny).toBeUndefined()
  expect((await write($, '/work/app/page.tsx', `const key = process.env.STRIPE_KEY`)).deny).toBeUndefined()
})

test('judges the file an edit produces and only what the edit adds', async ($, on) => {
  project(on, ['next'], { '/work/app/Pay.tsx': `'use client'\nconst a = process.env.OLD_KEY\nconst b = 1` })

  const added = await $.tool.call({
    tool: 'Edit',
    file_path: '/work/app/Pay.tsx',
    old_string: 'const b = 1',
    new_string: 'const b = process.env.SECRET',
    tool_use_id: 'e1',
  })
  expect(added.deny).toContain('SECRET is undefined in the browser')

  const kept = await $.tool.call({
    tool: 'Edit',
    file_path: '/work/app/Pay.tsx',
    old_string: 'const b = 1',
    new_string: 'const b = 2',
    tool_use_id: 'e2',
  })
  expect(kept.deny).toBeUndefined()
})

test('does nothing in a project with neither Vite nor Next.js', async ($, on) => {
  project(on, ['express'])

  expect((await write($, '/work/src/api.ts', 'const url = process.env.API_URL')).deny).toBeUndefined()
})

test('speaks the language set in the hub', async ($, on) => {
  project(on, ['vite'])
  // Stands in for the hub: answers the language it would hold.
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  const answer = await write($, '/work/src/api.ts', 'const url = import.meta.env.API_URL')
  expect(answer.deny).toContain('client-env-guard: o Vite esconde API_URL do navegador (src/api.ts)')
})

test('speaks Spanish when the hub says so', async ($, on) => {
  project(on, ['vite', 'next'])
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  expect((await write($, '/work/src/a.ts', 'const a = import.meta.env.API_URL')).deny).toContain(
    'client-env-guard: Vite oculta API_URL del navegador (src/a.ts). Renómbrala VITE_API_URL',
  )
  expect((await write($, '/work/src/b.ts', 'const a = process.env.API_URL')).deny).toContain(
    'Vite no define process.env en el navegador (src/b.ts)',
  )
  expect((await write($, '/work/app/C.tsx', `'use client'\nprocess.env.KEY`)).deny).toContain(
    'KEY es undefined en el navegador (app/C.tsx es un componente cliente)',
  )
})

test('Portuguese for process.env under Vite and a Next.js client component', async ($, on) => {
  project(on, ['vite', 'next'])
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  expect((await write($, '/work/src/b.ts', 'const a = process.env.API_URL')).deny).toContain(
    'o Vite não define process.env no navegador (src/b.ts)',
  )
  expect((await write($, '/work/app/C.tsx', `'use client'\nprocess.env.KEY`)).deny).toContain(
    'KEY é undefined no navegador (app/C.tsx é um componente cliente)',
  )
})

test('Vite: test, spec and declaration files and non-source files are not judged', async ($, on) => {
  project(on, ['vite'])

  for (const path of ['/work/src/a.test.ts', '/work/src/a.spec.tsx', '/work/src/env.d.ts', '/work/src/notes.md']) {
    expect((await write($, path, 'const a = import.meta.env.SECRET')).deny, path).toBeUndefined()
  }
})

test('Next.js: finds the directive after comments and in double quotes', async ($, on) => {
  project(on, ['next'])

  const commented = await write($, '/work/app/A.tsx', `// banner\n/* license */\n'use client'\nprocess.env.TOKEN`)
  expect(commented.deny).toContain('TOKEN is undefined in the browser')

  const doubled = await write($, '/work/app/B.tsx', `"use client"\nprocess.env.TOKEN`)
  expect(doubled.deny).toContain('TOKEN is undefined in the browser')

  expect((await write($, '/work/app/C.tsx', `'use client'\nprocess.env.NODE_ENV`)).deny).toBeUndefined()
})

test('a Write that keeps a problem the file already had is let through', async ($, on) => {
  project(on, ['vite'], { '/work/src/old.ts': 'const a = import.meta.env.API_URL' })

  expect((await write($, '/work/src/old.ts', 'const a = import.meta.env.API_URL\nconst b = 1')).deny).toBeUndefined()
})

test('an Edit on an unreadable file is judged on its new text', async ($, on) => {
  project(on, ['vite'])

  const answer = await $.tool.call({
    tool: 'Edit',
    file_path: '/work/src/new.ts',
    old_string: 'x',
    new_string: 'import.meta.env.HIDDEN',
    tool_use_id: 'e-new',
  })
  expect(answer.deny).toContain('Vite hides HIDDEN')
})

test('refuses with the failure text when the check itself throws', async ($, on) => {
  on('session.root', () => {
    throw new Error('no root')
  })
  on('fs.read', () => ({ deny: 'ENOENT' }))
  let ran = 0
  on('tool.call', { tool: 'Write' }, () => {
    ran += 1

    return { result: undefined as never }
  })

  const answer = await write($, '/work/src/a.ts', 'x')
  expect(answer.deny).toBe('client-env-guard: the check failed, confirm the variable is exposed to the browser.')
  expect(ran).toBe(0)
})
