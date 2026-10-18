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

test('knows keys, credentials and env variants, and lets templates through', async ($, on) => {
  let status = ''
  on('process.run', () => done(status))
  on('tool.call', { tool: 'Bash' }, () => ANSWER)

  for (const file of ['.ssh/id_ed25519', 'gcp/credentials.json', '.npmrc', 'app/.env.local', 'release.keystore', 'cert.p12']) {
    status = `?? ${file}\n`
    const answer = await $.tool.call({ tool: 'Bash', command: 'git add -A', tool_use_id: `k-${file}` })
    expect(answer.deny, file).toContain(`${file} look like secrets`)
  }

  for (const file of ['.env.sample', '.env.template', 'docs/keys.md', 'id_rsa.pub']) {
    status = `?? ${file}\n`
    const answer = await $.tool.call({ tool: 'Bash', command: 'git add .', tool_use_id: `t-${file}` })
    expect(answer.deny, file).toBeUndefined()
  }
})

test('reads the new name of a rename and shows at most five files', async ($, on) => {
  let status = 'R  old.txt -> config/.env\n'
  on('process.run', () => done(status))
  on('tool.call', { tool: 'Bash' }, () => ANSWER)

  expect((await $.tool.call({ tool: 'Bash', command: 'git add -A', tool_use_id: 'r1' })).deny).toContain('config/.env look like secrets')

  status = Array.from({ length: 7 }, (_, i) => `?? k${i}.pem`).join('\n')
  const answer = await $.tool.call({ tool: 'Bash', command: 'git add *', tool_use_id: 'r2' })
  expect(answer.deny).toContain('k0.pem, k1.pem, k2.pem, k3.pem, k4.pem (+2) look like secrets')
})

test('lets the command through outside a git repository', async ($, on) => {
  let ran = 0
  on('process.run', () => ({ value: { exitCode: 128, stdout: '', stderr: 'fatal', isStdoutTruncated: false, isStderrTruncated: false } }))
  on('tool.call', { tool: 'Bash' }, () => {
    ran += 1

    return ANSWER
  })

  expect((await $.tool.call({ tool: 'Bash', command: 'git add -A', tool_use_id: 'n1' })).deny).toBeUndefined()
  expect(ran).toBe(1)
})

test('refuses with a clear reason when git cannot be asked', async ($, on) => {
  on('process.run', () => ({ deny: 'spawn git ENOENT' }))
  on('tool.call', { tool: 'PowerShell' }, () => ANSWER as never)

  const answer = await $.tool.call({ tool: 'PowerShell', command: 'git add -A', tool_use_id: 'f1' })
  expect(answer.deny).toBe('stage-guard: the check failed, command refused.')
})

test('guards PowerShell and speaks Spanish when the hub is set to es', async ($, on) => {
  on('process.run', () => done('?? secrets/.env\n'))
  on('tool.call', { tool: 'PowerShell' }, () => ANSWER as never)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  const answer = await $.tool.call({ tool: 'PowerShell', command: ['git', 'commit', '--all', '-m', 'wip'].join(' '), tool_use_id: 'es' })
  expect(answer.deny).toBe(
    'stage-guard rechazó agregar todo: secrets/.env parecen secretos. Agrega los archivos que quieres por nombre o ponlos en .gitignore.',
  )
})
