import { expect, test } from 'claude-code/testing'
import type { On } from 'claude-code'

const world = (on: On) => {
  on('tool.call', { tool: 'Bash' }, () => ({ result: { stdout: '', stderr: '', interrupted: false } }))
}

const run = (command: string, $: { tool: { call: (input: never) => Promise<{ deny?: string }> } }, id: string) =>
  $.tool.call({ tool: 'Bash', command, tool_use_id: id } as never)

test('refuses an unfiltered find, ls -R and recursive dir or Get-ChildItem', async ($, on) => {
  world(on)

  const find = await run('find . -type f', $, 'f1')
  expect(find.deny).toContain('an unfiltered find lists node_modules')

  expect((await run('ls -laR', $, 'f2')).deny).toContain('ls -R lists node_modules')
  expect((await run('dir /s', $, 'f3')).deny).toContain('a recursive listing includes node_modules')
  expect((await run('Get-ChildItem -Recurse', $, 'f4')).deny).toContain('a recursive listing')
})

test('lets filtered, piped and plain listings through', async ($, on) => {
  world(on)

  const fine = [
    'find . -name "*.ts" -not -path "./node_modules/*"',
    'find src -maxdepth 2',
    'find . -type f | head -50',
    'ls -la',
    'ls src',
    'dir',
    'Get-ChildItem -Recurse -Filter *.ts',
    'git ls-files',
  ]

  for (const [at, command] of fine.entries()) {
    expect((await run(command, $, `k${at}`)).deny).toBeUndefined()
  }
})

test('speaks the language set in the hub', async ($, on) => {
  world(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  expect((await run('find .', $, 'p1')).deny).toContain('um find sem filtro lista node_modules')
})

test('speaks Spanish when the hub is set to es', async ($, on) => {
  world(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  expect((await run('find .', $, 'e1')).deny).toBe(
    'tree-flood-guard: un find sin filtro lista node_modules y la salida de build. Usa git ls-files, Glob, o añade -maxdepth o -name.',
  )
  expect((await run('ls -R', $, 'e2')).deny).toContain('ls -R lista node_modules y la salida de build')
  expect((await run('gci . -Recurse', $, 'e3')).deny).toContain('un listado recursivo incluye node_modules')
})

test('refuses the long and upper-case spellings', async ($, on) => {
  world(on)

  expect((await run('ls --recursive src', $, 'u1')).deny).toContain('ls -R lists')
  expect((await run('DIR C:\work /S', $, 'u2')).deny).toContain('a recursive listing')
  expect((await run('  find /var/www -type d', $, 'u3')).deny).toContain('an unfiltered find')
})

test('lets a listing through when a filter or a redirect narrows it', async ($, on) => {
  let ran = 0
  on('tool.call', { tool: 'Bash' }, () => {
    ran += 1

    return { result: { stdout: '', stderr: '', interrupted: false } }
  })

  const fine = [
    'find . -iname readme.md',
    'find . -newer package.json',
    'find . -empty',
    'find . -size +10M',
    'Get-ChildItem -Recurse -Depth 2',
    'gci -Recurse -Include *.cs',
    'ls -R > tree.txt',
    'ls -l --color',
  ]

  for (const [at, command] of fine.entries()) {
    expect((await run(command, $, `n${at}`)).deny, command).toBeUndefined()
  }

  expect(ran).toBe(fine.length)
})

test('never runs a refused listing', async ($, on) => {
  let ran = 0
  on('tool.call', { tool: 'Bash' }, () => {
    ran += 1

    return { result: { stdout: '', stderr: '', interrupted: false } }
  })

  await run('find .', $, 'r1')
  await run('ls -R', $, 'r2')
  expect(ran).toBe(0)
})
