import type { EngineInterface, Register } from 'claude-code'

// Read once per module load; a git command that moves remotes or branches clears it.
// The section is read by the model only: English, not translated.
const cache: { text: string | undefined } = { text: undefined }

const CHANGES_REMOTES = /\bgit\s+(?:-\S+\s+)*(remote|fetch|clone|init|branch\s+-[mM])\b/

const git = async ($: EngineInterface, argv: readonly string[]): Promise<string | undefined> => {
  const ran = await $.process.run(['git', ...argv], { timeoutMs: 5000 }).catch(() => undefined)

  return ran === undefined || ran.exitCode !== 0 ? undefined : ran.stdout.trim()
}

// A remote URL without the credentials that may sit before the host.
const clean = (url: string): string => url.replace(/^(\w+:\/\/)[^@/\s]+@/, '$1')

const describe = async ($: EngineInterface): Promise<string> => {
  const listing = await git($, ['remote', '-v'])

  if (listing === undefined || listing === '') {
    return ''
  }

  const remotes: [string, string][] = []

  for (const line of listing.split('\n')) {
    const match = /^(\S+)\s+(\S+)\s+\(fetch\)$/.exec(line.trim())

    if (match !== null && !remotes.some(([name]) => name === match[1])) {
      remotes.push([match[1] ?? '', clean(match[2] ?? '')])
    }
  }

  if (remotes.length === 0) {
    return ''
  }

  const first = remotes.find(([name]) => name === 'origin') ?? remotes[0]
  const head = await git($, ['symbolic-ref', '--short', `refs/remotes/${first?.[0] ?? 'origin'}/HEAD`])
  let base = head?.split('/').slice(1).join('/')

  if (base === undefined || base === '') {
    for (const candidate of ['main', 'master', 'develop']) {
      if ((await git($, ['rev-parse', '--verify', '--quiet', `refs/heads/${candidate}`])) !== undefined) {
        base = candidate
        break
      }
    }
  }

  return [
    '# Git remote',
    base === undefined || base === '' ? undefined : `- Default branch: ${base}`,
    ...remotes.map(([name, url]) => `- Remote ${name}: ${url}`),
  ]
    .filter((line): line is string => line !== undefined)
    .join('\n')
}

const watch = <R extends { deny?: string; isError?: boolean }>(command: string, ran: R): R => {
  if (ran.deny === undefined && CHANGES_REMOTES.test(command)) {
    cache.text = undefined
  }

  return ran
}

export const register: Register = on => {
  on('prompt.compose', async ($, e, next) => {
    const composed = await next(e)
    cache.text ??= await describe($)

    return cache.text === ''
      ? composed
      : { sections: [...composed.sections, { id: 'remote-context:remote', text: cache.text, scope: 'session' }] }
  })

  on('tool.call', { tool: 'Bash' }, async (_$, e, next) => watch(e.command, await next(e)))

  on('tool.call', { tool: 'PowerShell' }, async (_$, e, next) => watch(e.command, await next(e)))
}
