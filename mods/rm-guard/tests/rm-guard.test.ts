import { expect, test } from 'claude-code/testing'

const BLOCKED = [
  'rm -rf /',
  'sudo rm -rf ~',
  'cd build && rm -fr ..',
  'rm -r --force "$HOME"',
  'mkfs.ext4 /dev/sda1',
  'dd if=/dev/zero of=/dev/sda bs=1M',
]

const ALLOWED = ['rm -rf node_modules', 'rm notes.txt', 'ls -la /', 'git status']

const ANSWER = { result: { stdout: '', stderr: '', interrupted: false } }

test('refuses destructive removals in Bash, in English by default', async ($, on) => {
  let ran = 0
  on('tool.call', { tool: 'Bash' }, () => {
    ran += 1

    return ANSWER
  })

  for (const command of BLOCKED) {
    const answer = await $.tool.call({ tool: 'Bash', command, tool_use_id: `b-${command}` })
    expect(answer.deny, command).toContain('rm-guard blocked the command')
  }

  expect(ran).toBe(0)
})

test('lets everyday commands through', async ($, on) => {
  let ran = 0
  on('tool.call', { tool: 'Bash' }, () => {
    ran += 1

    return ANSWER
  })

  for (const command of ALLOWED) {
    const answer = await $.tool.call({ tool: 'Bash', command, tool_use_id: `a-${command}` })
    expect(answer.deny, command).toBeUndefined()
  }

  expect(ran).toBe(ALLOWED.length)
})

test('refuses a recursive Remove-Item on a drive root in PowerShell', async ($, on) => {
  on('tool.call', { tool: 'PowerShell' }, () => ANSWER)

  const blocked = await $.tool.call({
    tool: 'PowerShell',
    command: 'Remove-Item -Recurse -Force C:\\',
    tool_use_id: 'p-1',
  })
  expect(blocked.deny).toContain('rm-guard')

  const allowed = await $.tool.call({
    tool: 'PowerShell',
    command: 'Remove-Item -Recurse -Force .\\dist',
    tool_use_id: 'p-2',
  })
  expect(allowed.deny).toBeUndefined()
})

test('speaks the language set in the hub', async ($, on) => {
  on('tool.call', { tool: 'Bash' }, () => ANSWER)
  // Stands in for the hub: answers the language it would hold.
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  const answer = await $.tool.call({ tool: 'Bash', command: 'rm -rf /', tool_use_id: 'pt-1' })
  expect(answer.deny).toContain('rm-guard bloqueou o comando: apagar recursivamente "/"')
})

test('names the reason of each always-refused command', async ($, on) => {
  on('tool.call', { tool: 'Bash' }, () => ANSWER)

  const reasons: [string, string][] = [
    ['dd if=img.iso of=/dev/nvme0n1', 'writing straight to a disk (dd)'],
    ['cat img > /dev/sdb', 'redirecting output onto a disk'],
    [':(){ :|:& };:', 'fork bomb'],
    ['chmod -R 777 /', 'chmod -R 777 on the root'],
    ['mkfs -t ext4 /dev/sdb1', 'formatting a file system (mkfs)'],
  ]

  for (const [command, why] of reasons) {
    const answer = await $.tool.call({ tool: 'Bash', command, tool_use_id: `r-${command}` })
    expect(answer.deny, command).toBe(`rm-guard blocked the command: ${why}. If it really is intended, ask the user to run it by hand.`)
  }
})

test('finds a removal in any segment, and needs it to be recursive', async ($, on) => {
  let ran = 0
  on('tool.call', { tool: 'Bash' }, () => {
    ran += 1

    return ANSWER
  })

  for (const command of ['echo hi; rm -rf ./*', 'ls\nrm -Rf ~/*', 'true || rm --recursive -f ..', 'rm -rf "${HOME}"']) {
    expect((await $.tool.call({ tool: 'Bash', command, tool_use_id: `s-${command}` })).deny, command).toContain('recursively deleting')
  }

  for (const command of ['rm ~', 'rm -f /', 'rm -rf ./build', 'echo "rm -rf" > note.txt']) {
    expect((await $.tool.call({ tool: 'Bash', command, tool_use_id: `n-${command}` })).deny, command).toBeUndefined()
  }

  expect(ran).toBe(4)
})

test('refuses Windows removals and disk wipes in PowerShell', async ($, on) => {
  on('tool.call', { tool: 'PowerShell' }, () => ANSWER)

  for (const [command, why] of [
    ['rd /s /q C:\\', 'recursively deleting "C:\\"'],
    ['Remove-Item $env:USERPROFILE -Recurse', 'recursively deleting "$env:USERPROFILE"'],
    ['Format-Volume -DriveLetter D', 'formatting or wiping a disk'],
    ['format d: /q', 'formatting a drive'],
  ] as const) {
    const answer = await $.tool.call({ tool: 'PowerShell', command, tool_use_id: `w-${command}` })
    expect(answer.deny, command).toContain(why)
  }
})

test('speaks Spanish when the hub says so', async ($, on) => {
  on('tool.call', { tool: 'Bash' }, () => ANSWER)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  const removal = await $.tool.call({ tool: 'Bash', command: 'rm -rf ~', tool_use_id: 'es-1' })
  expect(removal.deny).toBe('rm-guard bloqueó el comando: borrar recursivamente "~". Si de verdad es intencional, pide al usuario que lo ejecute a mano.')

  const dd = await $.tool.call({ tool: 'Bash', command: 'dd if=/dev/zero of=/dev/sda', tool_use_id: 'es-2' })
  expect(dd.deny).toContain('escribir directo en un disco (dd)')
})
