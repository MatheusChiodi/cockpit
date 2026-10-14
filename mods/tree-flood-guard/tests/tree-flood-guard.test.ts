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
