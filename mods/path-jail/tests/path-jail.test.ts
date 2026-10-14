import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'

// Where each path that exists on the stand-in disk really lands (a symlink resolves elsewhere).
const DISK: Record<string, string> = {
  '/proj': '/proj',
  '/proj/src': '/proj/src',
  '/proj/src/a.ts': '/proj/src/a.ts',
  '/proj/link': '/etc',
  '/etc': '/etc',
}

const ANSWER = { result: undefined as never }

const write = (file_path: string, id: string) => ({
  tool: 'Write' as const,
  file_path,
  content: 'x',
  tool_use_id: id,
})

const disk = (on: On) => {
  on('session.root', () => ({ value: '/proj' }))
  on('session.cwd', () => ({ value: '/proj' }))
  mock.env(on, {})
  on('fs.stat', ($, e) => {
    // The kit may anchor the path to a drive and flip its slashes: compare the plain form.
    const plain = e.path.replace(/^[A-Za-z]:/, '').replace(/\\/g, '/').replace(/\/+$/, '')
    const realPath = DISK[plain]

    return { value: { kind: 'file' as const, size: 0, mtimeMs: 0, isLink: false, realPath } }
  })
  on('tool.call', { tool: 'Write' }, () => ANSWER)
  on('tool.call', { tool: 'Edit' }, () => ANSWER)
}

test('refuses writes outside the session root, symlinks included', async ($, on) => {
  disk(on)

  const hosts = await $.tool.call(write('/etc/hosts', 'w1'))
  expect(hosts.deny).toContain('path-jail: /etc/hosts is outside the project')

  const viaLink = await $.tool.call(write('/proj/link/x.ts', 'w2'))
  expect(viaLink.deny).toContain('is outside the project')

  const edit = await $.tool.call({
    tool: 'Edit',
    file_path: '/etc/hosts',
    old_string: 'a',
    new_string: 'b',
    tool_use_id: 'e1',
  })
  expect(edit.deny).toContain('is outside the project')
})

test('lets writes inside the session root through, new files included', async ($, on) => {
  disk(on)

  const existing = await $.tool.call(write('/proj/src/a.ts', 'w3'))
  expect(existing.deny).toBeUndefined()

  const created = await $.tool.call(write('/proj/src/new.ts', 'w4'))
  expect(created.deny).toBeUndefined()

  const nested = await $.tool.call(write('/proj/src/deep/er/new.ts', 'w5'))
  expect(nested.deny).toBeUndefined()
})

test('speaks the language set in the hub', async ($, on) => {
  disk(on)
  // Stands in for the hub: answers the language it would hold.
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  const answer = await $.tool.call(write('/etc/hosts', 'pt-1'))
  expect(answer.deny).toContain('path-jail: /etc/hosts fica fora do projeto')
})
