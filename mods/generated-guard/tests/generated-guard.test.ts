import { expect, test } from 'claude-code/testing'

const BLOCKED = ['node_modules/react/index.js', 'C:\\project\\dist\\main.js', 'web/.next/server/app.js', '.git/config']

const ALLOWED = ['src/build/index.ts', 'src/distribution.ts', 'outline.md']

const edit = (file_path: string, id: string) => ({
  tool: 'Edit' as const,
  file_path,
  old_string: 'a',
  new_string: 'b',
  tool_use_id: id,
})

test('refuses editing generated folders and lets source code through', async ($, on) => {
  on('tool.call', { tool: 'Edit' }, () => ({ result: undefined as never }))

  for (const file_path of BLOCKED) {
    const answer = await $.tool.call(edit(file_path, `e-${file_path}`))
    expect(answer.deny, file_path).toContain('is in a generated or dependency folder')
  }

  for (const file_path of ALLOWED) {
    const answer = await $.tool.call(edit(file_path, `ok-${file_path}`))
    expect(answer.deny, file_path).toBeUndefined()
  }
})

test('speaks the language set in the hub', async ($, on) => {
  on('tool.call', { tool: 'Edit' }, () => ({ result: undefined as never }))
  // Stands in for the hub: answers the language it would hold.
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  const answer = await $.tool.call(edit('node_modules/react/index.js', 'pt-1'))
  expect(answer.deny).toContain(
    'generated-guard: node_modules/react/index.js fica em pasta gerada ou de dependências',
  )
})

test('refuses Write in generated folders too', async ($, on) => {
  let ran = 0
  on('tool.call', { tool: 'Write' }, () => {
    ran += 1

    return { result: undefined as never }
  })

  const blocked = await $.tool.call({ tool: 'Write', file_path: '/repo/coverage/lcov.info', content: 'x', tool_use_id: 'w1' })
  expect(blocked.deny).toBe(
    'generated-guard: /repo/coverage/lcov.info is in a generated or dependency folder. Change the source code and generate it again.',
  )

  const allowed = await $.tool.call({ tool: 'Write', file_path: '/repo/src/index.ts', content: 'x', tool_use_id: 'w2' })
  expect(allowed.deny).toBeUndefined()
  expect(ran).toBe(1)
})

test('covers every always-generated folder, whatever the case or separator', async ($, on) => {
  on('tool.call', { tool: 'Edit' }, () => ({ result: undefined as never }))

  for (const file_path of [
    'C:\\repo\\NODE_MODULES\\x\\a.js',
    'web/.nuxt/app.js',
    'app/.expo/settings.json',
    '.turbo/cache/x',
    'pkg/__pycache__/m.pyc',
    '.venv/lib/site.py',
    'src/node_modules/x.js',
  ]) {
    expect((await $.tool.call(edit(file_path, `g-${file_path}`))).deny, file_path).toContain('generated-guard')
  }
})

test('treats dist, build, out, target and vendor as generated only outside a source folder', async ($, on) => {
  on('tool.call', { tool: 'Edit' }, () => ({ result: undefined as never }))

  for (const file_path of ['build/app.js', '/repo/out/index.html', 'target/classes/A.class', 'vendor/autoload.php']) {
    expect((await $.tool.call(edit(file_path, `b-${file_path}`))).deny, file_path).toContain('generated-guard')
  }

  for (const file_path of ['app/out/page.tsx', 'lib/vendor/shim.ts', 'scripts/build/run.mjs', 'tests/dist/fixture.js']) {
    expect((await $.tool.call(edit(file_path, `s-${file_path}`))).deny, file_path).toBeUndefined()
  }
})

test('speaks Spanish when the hub is set to es', async ($, on) => {
  on('tool.call', { tool: 'Edit' }, () => ({ result: undefined as never }))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  const answer = await $.tool.call(edit('dist/main.js', 'es-1'))
  expect(answer.deny).toBe(
    'generated-guard: dist/main.js está en una carpeta generada o de dependencias. Cambia el código fuente y genéralo de nuevo.',
  )
})
