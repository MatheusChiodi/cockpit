import type { EngineInterface, Register } from 'claude-code'

const MAX_ISSUES = 2
const MAX_BODY = 3000

// Matches "issue 12", "issue #12", "issues/12" in a link.
const MENTION = /\bissues?\s*#?(\d+)\b|\/issues\/(\d+)\b/gi

type Issue = {
  number?: number
  title?: string
  state?: string
  body?: string
  labels?: { name?: string }[]
}

// Hidden context, read by the model only: English, not translated.
const describe = async ($: EngineInterface, number: string): Promise<string | undefined> => {
  const ran = await $.process
    .run(['gh', 'issue', 'view', number, '--json', 'number,title,state,body,labels'], { timeoutMs: 15000 })
    .catch(() => undefined)

  if (ran === undefined || ran.exitCode !== 0) {
    return undefined
  }

  let issue: Issue = {}

  try {
    issue = JSON.parse(ran.stdout) as Issue
  } catch {
    return undefined
  }

  if (issue.number === undefined) {
    return undefined
  }

  const labels = (issue.labels ?? []).map(label => label.name ?? '').filter(name => name !== '')
  const body = issue.body ?? ''

  return [
    `GitHub issue #${issue.number}: ${issue.title ?? ''} (${(issue.state ?? '').toLowerCase()}${labels.length > 0 ? `, ${labels.join(', ')}` : ''})`,
    body.length > MAX_BODY ? `${body.slice(0, MAX_BODY)}\n… (truncated)` : body,
  ].join('\n')
}

export const register: Register = on => {
  // A prompt that names an issue carries its text as hidden context: Claude does not need to run gh.
  on('prompt.submit', async ($, e, next) => {
    if (e.origin.kind !== 'composer' || e.text.startsWith('/')) {
      return next(e)
    }

    const numbers = [...new Set([...e.text.matchAll(MENTION)].map(found => found[1] ?? found[2] ?? ''))].slice(0, MAX_ISSUES)
    const found = (await Promise.all(numbers.map(number => describe($, number)))).filter(
      (text): text is string => text !== undefined,
    )

    return found.length === 0 ? next(e) : next({ ...e, context: [...(e.context ?? []), ...found] })
  })
}
