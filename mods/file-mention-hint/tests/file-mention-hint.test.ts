import { expect, test } from 'claude-code/testing'

const send = (text: string) => ({ text, wait: false, origin: { kind: 'composer' } as const })

const TRACKED = ['src/app/login.ts', 'src/old/login.ts', 'src/util.ts', 'README.md'].join('\n')

const LS = {
  value: { exitCode: 0, stdout: `${TRACKED}\n`, stderr: '', isStdoutTruncated: false, isStderrTruncated: false },
}

test('adds the tracked paths of a bare file name', async ($, on) => {
  on('process.run', () => LS)
  on('prompt.submit', ($, e) => ({ text: e.text, context: e.context }))

  const entered = await $.prompt.submit(send('fix the bug in login.ts please'))
  const context = (entered.context ?? []).join('\n')

  expect(context).toContain('- src/app/login.ts')
  expect(context).toContain('- src/old/login.ts')
  expect(context).not.toContain('util.ts')
})

test('ignores @mentions, paths, unknown files and slash commands', async ($, on) => {
  on('process.run', () => LS)
  on('prompt.submit', ($, e) => ({ text: e.text, context: e.context }))

  for (const text of ['look at @login.ts', 'open src/app/login.ts', 'what is missing.ts?', '/login.ts']) {
    const entered = await $.prompt.submit(send(text))
    expect(entered.context ?? [], text).toHaveLength(0)
  }
})


