import { expect, test } from 'claude-code/testing'

const slashed = (path: string) => path.replaceAll('\\', '/')

// A project at /work with a package.json and optionally a vite.config.ts; `up` lists the ports that answer.
const world = (
  on: any,
  up: number[],
  scripts: Record<string, string> = { dev: 'vite' },
  viteConfig?: string,
  verdict: object = { decision: 'allow' },
) => {
  on('session.root', () => ({ value: '/work' }))
  on('fs.read', (_: unknown, e: { path: string }) => {
    const path = slashed(e.path)

    if (path.endsWith('/work/package.json')) {
      return { value: JSON.stringify({ scripts }) }
    }

    return viteConfig !== undefined && path.endsWith('/work/vite.config.ts') ? { value: viteConfig } : { deny: 'ENOENT' }
  })
  on('http.fetch', (_: unknown, e: { url: string }) => {
    if (!up.some(port => e.url === `http://localhost:${port}/`)) {
      return { deny: 'connection refused' }
    }

    return { value: { status: 200, ok: true, headers: {}, text: '' } }
  })
  on('tool.check', () => verdict)
}

const check = ($: any, command: string, tool = 'Bash') => $.tool.check({ tool, input: { command } })

test('asks before a dev server starts on a port that already answers', async ($, on) => {
  world(on, [5173, 3000, 4000])

  for (const command of ['npm run dev', 'pnpm dev', 'yarn dev', 'npx vite', 'vite --host', 'cd web && vite dev', 'next dev', 'npx next dev -p 4000']) {
    const verdict = await check($, command)
    expect(verdict.decision, command).toBe('ask')
    expect(verdict.reason, command).toContain('dev-server-guard: something already answers on :')
  }

  expect((await check($, 'npm run dev')).reason).toContain('on :5173.')
  expect((await check($, 'next dev')).reason).toContain('on :3000.')
  expect((await check($, 'npx next dev -p 4000')).reason).toContain('on :4000.')
  expect((await check($, 'PORT=4000 npm run dev', 'PowerShell')).decision).toBe('ask')
})

test('reads the port from the dev script and from the Vite config', async ($, on) => {
  world(on, [4321, 8888], { dev: 'vite --port 4321' }, 'export default { server: { port: 8888 } }')

  expect((await check($, 'npm run dev')).reason).toContain('on :4321.')
  expect((await check($, 'vite')).reason).toContain('on :8888.')
})

test('lets the command through when it is not a dev server', async ($, on) => {
  world(on, [5173, 3000])

  for (const command of ['npm run build', 'vite build', 'next build', 'npm test', 'git status']) {
    expect((await check($, command)).decision, command).toBe('allow')
  }
})

test('lets a dev server start when its port is free', async ($, on) => {
  world(on, [])

  for (const command of ['npm run dev', 'next dev', 'vite']) {
    expect((await check($, command)).decision, command).toBe('allow')
  }
})

test('does not loosen a verdict that is already a deny', async ($, on) => {
  world(on, [5173], { dev: 'vite' }, undefined, { decision: 'deny', reason: 'blocked beneath' })

  expect((await check($, 'npm run dev')).decision).toBe('deny')
})

test('speaks the language set in the hub', async ($, on) => {
  world(on, [5173])
  // Stands in for the hub: answers the language it would hold.
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  expect((await check($, 'npm run dev')).reason).toBe('dev-server-guard: algo já responde na porta :5173. Subir outro servidor de desenvolvimento?')
})
