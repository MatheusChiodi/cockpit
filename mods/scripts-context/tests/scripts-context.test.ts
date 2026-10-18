import { expect, test } from 'claude-code/testing'

const INPUT = { model: 'claude-test', promptModel: 'claude-test', surfaces: ['terminal'], tools: [], outputStyle: null, traits: [] } as never

// The project's files by name, read live from `files`; the sections beneath come from `below`.
const project = (on: any, files: Record<string, string>) => {
  const fileOf = (path: string) => path.replaceAll('\\', '/').split('/').pop() ?? ''

  on('session.root', () => ({ value: '/work' }))
  on('fs.exists', (_: unknown, e: { path: string }) => ({ value: fileOf(e.path) in files }))
  on('fs.read', (_: unknown, e: { path: string }) =>
    fileOf(e.path) in files ? { value: files[fileOf(e.path)] } : { deny: 'ENOENT' })
  on('prompt.compose', () => ({ sections: [{ id: 'other', text: 'kept', scope: 'session' as const }] }))
  on('tool.call', { tool: 'Edit' }, () => ({ result: undefined as never }))
}

const composed = async ($: any): Promise<{ id: string; text: string }[]> => (await $.prompt.compose(INPUT)).sections

test('lists the useful scripts and the package manager from the lockfile', async ($, on) => {
  project(on, {
    'package.json': JSON.stringify({ scripts: { test: 'vitest run', lint: 'eslint .', build: 'tsc', prepare: 'husky', 'test:e2e': 'playwright test' } }),
    'pnpm-lock.yaml': '',
  })

  const sections = await composed($)
  expect(sections.map(s => s.id)).toEqual(['other', 'scripts-context:scripts'])

  const text = sections[1]!.text
  expect(text).toContain('run with pnpm')
  expect(text).toContain('- test: vitest run')
  expect(text).toContain('- test:e2e: playwright test')
  expect(text).not.toContain('husky')
})

test('prefers the packageManager field and never shows a script holding a secret', async ($, on) => {
  const leak = `ghp_${'a1B2'.repeat(9)}`
  project(on, {
    'package.json': JSON.stringify({ packageManager: 'yarn@4.1.0', scripts: { build: 'tsc', deploy: 'x', start: `TOKEN=${leak} node .` } }),
  })

  const text = (await composed($))[1]!.text
  expect(text).toContain('run with yarn')
  expect(text).toContain('- build: tsc')
  expect(text).not.toContain(leak)
  expect(text).not.toContain('start')
})

test('reads once and refreshes after package.json is edited', async ($, on) => {
  const files: Record<string, string> = { 'package.json': JSON.stringify({ scripts: { test: 'jest' } }) }
  project(on, files)

  expect((await composed($))[1]!.text).toContain('jest')

  files['package.json'] = JSON.stringify({ scripts: { test: 'vitest' } })
  expect((await composed($))[1]!.text).toContain('jest')

  await $.tool.call({ tool: 'Edit', file_path: '/work/package.json', old_string: 'a', new_string: 'b', tool_use_id: 'e1' })
  expect((await composed($))[1]!.text).toContain('vitest')
})

test('adds nothing without package.json or without useful scripts', async ($, on) => {
  project(on, { 'README.md': '' })
  expect((await composed($)).map(s => s.id)).toEqual(['other'])
})

test('picks the package manager from yarn, bun and npm lockfiles, npm without any', async ($, on) => {
  const files: Record<string, string> = { 'package.json': JSON.stringify({ scripts: { test: 'x' } }) }
  project(on, files)
  on('tool.call', { tool: 'Write' }, () => ({ result: undefined as never }))

  expect((await composed($))[1]!.text).toContain('run with npm)')

  for (const [lock, manager] of [['yarn.lock', 'yarn'], ['bun.lockb', 'bun'], ['package-lock.json', 'npm']] as const) {
    for (const name of ['yarn.lock', 'bun.lockb', 'package-lock.json']) {
      delete files[name]
    }

    files[lock] = ''
    await $.tool.call({ tool: 'Write', file_path: `/work/${lock}`, content: '', tool_use_id: `w-${lock}` })
    expect((await composed($))[1]!.text, lock).toContain(`run with ${manager})`)
  }
})

test('cuts long commands at 90 characters and keeps at most 10 scripts', async ($, on) => {
  const scripts: Record<string, string> = { build: 'x'.repeat(120) }

  for (let at = 0; at < 12; at += 1) {
    scripts[`test:${at}`] = `vitest ${at}`
  }

  project(on, { 'package.json': JSON.stringify({ scripts }) })

  const lines = (await composed($))[1]!.text.split('\n')
  expect(lines).toHaveLength(11)
  expect(lines[1]).toBe(`- build: ${'x'.repeat(90)}…`)
})

test('ignores scripts that are not strings, and password flags', async ($, on) => {
  project(on, {
    'package.json': JSON.stringify({ scripts: { test: 42, lint: 'eslint .', deploy: 'x', dev: 'serve --password hunter2' } }),
  })

  expect((await composed($))[1]!.text).toBe('# Project scripts (package.json, run with npm)\n- lint: eslint .')
})

test('adds nothing when package.json is not valid JSON', async ($, on) => {
  project(on, { 'package.json': '{ "scripts": ' })

  expect((await composed($)).map(s => s.id)).toEqual(['other'])
})

test('a packageManager field without a version is taken whole', async ($, on) => {
  project(on, { 'package.json': JSON.stringify({ packageManager: 'bun', scripts: { dev: 'bun run src/index.ts' } }), 'yarn.lock': '' })

  expect((await composed($))[1]!.text).toContain('run with bun)')
})
