import { expect, test } from 'claude-code/testing'

const ANSWER = { result: { stdout: '', stderr: '', interrupted: false } }

const done = (stdout: string) => ({
  value: { exitCode: 0, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false },
})

test('refuses staging everything while a secret file is pending', async ($, on) => {
  let status = ' M src/app.ts\n?? .env\n?? certs/server.pem\n'
  on('process.run', () => done(status))
  on('tool.call', { tool: 'Bash' }, () => ANSWER)

  for (const command of ['git add -A', 'git add .', 'git add --all', 'git commit -am "x"']) {
    const answer = await $.tool.call({ tool: 'Bash', command, tool_use_id: 'r' })
    expect(answer.deny, command).toContain('.env, certs/server.pem look like secrets')
  }

  for (const command of ['git add src/app.ts', 'git status', 'git commit -m "x"']) {
    const answer = await $.tool.call({ tool: 'Bash', command, tool_use_id: 'a' })
    expect(answer.deny, command).toBeUndefined()
  }

  status = ' M src/app.ts\n?? .env.example\n'
  const fine = await $.tool.call({ tool: 'Bash', command: 'git add -A', tool_use_id: 'f' })
  expect(fine.deny).toBeUndefined()
})

test('speaks the language set in the hub', async ($, on) => {
  on('process.run', () => done('?? .env\n'))
  on('tool.call', { tool: 'Bash' }, () => ANSWER)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  const answer = await $.tool.call({ tool: 'Bash', command: 'git add .', tool_use_id: 'pt' })
  expect(answer.deny).toContain('parecem segredos')
})
