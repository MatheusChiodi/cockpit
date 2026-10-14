import { expect, test } from 'claude-code/testing'

const bash = (command: string) => ({ tool: 'Bash', input: { command } })

test('asks before staging an archive, installer or database dump', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))
  on('fs.stat', () => ({ value: { kind: 'file', size: 1024, mtimeMs: 0, isLink: false } }))

  for (const command of [
    'git add release.zip',
    'git add -f build/app.exe',
    'git add src/a.ts backup.sqlite',
    'git add "dump.tar.gz"',
  ]) {
    const verdict = await $.tool.check(bash(command))
    expect(verdict.decision, command).toBe('ask')
    expect(verdict.reason, command).toContain('binary or archive')
  }
})

test('asks before staging a file over 5 MB', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))
  on('fs.stat', () => ({ value: { kind: 'file', size: 12 * 1024 * 1024, mtimeMs: 0, isLink: false } }))

  const verdict = await $.tool.check(bash('git add assets/intro.json'))
  expect(verdict.decision).toBe('ask')
  expect(verdict.reason).toContain('assets/intro.json, 12.0 MB')
})

test('lets ordinary staging through', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))
  on('fs.stat', () => ({ value: { kind: 'file', size: 2048, mtimeMs: 0, isLink: false } }))

  for (const command of [
    'git add src/app.ts',
    'git add .',
    'git add -p',
    'git add docs/readme.md logo.svg',
    'git status',
    'ls release.zip',
  ]) {
    const verdict = await $.tool.check(bash(command))
    expect(verdict.decision, command).toBe('allow')
  }
})

test('ignores a directory', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))
  on('fs.stat', () => ({ value: { kind: 'dir', size: 99 * 1024 * 1024, mtimeMs: 0, isLink: false } }))

  const verdict = await $.tool.check(bash('git add assets'))
  expect(verdict.decision).toBe('allow')
})

test('does not loosen a verdict that is already a deny', async ($, on) => {
  on('tool.check', () => ({ decision: 'deny', reason: 'blocked beneath' }))

  const verdict = await $.tool.check(bash('git add release.zip'))
  expect(verdict.decision).toBe('deny')
})

test('speaks the language set in the hub', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))
  // Stands in for the hub: answers the language it would hold.
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  const verdict = await $.tool.check(bash('git add release.zip'))
  expect(verdict.reason).toContain('archive-add-guard: git add de um binário ou arquivo compactado (release.zip)')
})
