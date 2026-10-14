import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const TS = /\.(?:[cm]?tsx?)$/i

const MARKERS: readonly { name: string; pattern: RegExp }[] = [
  { name: '": any"', pattern: /:\s*any\b(?!\s*[-?:])/g },
  { name: '"as any"', pattern: /\bas\s+any\b/g },
  { name: '"<any>"', pattern: /<any>/g },
  { name: '"any[]"', pattern: /\bany\[\]/g },
]

const count = (pattern: RegExp, text: string): number => text.match(pattern)?.length ?? 0

const field = (input: unknown, key: string): string => {
  const value = typeof input === 'object' && input !== null ? (input as Record<string, unknown>)[key] : undefined

  return typeof value === 'string' ? value : ''
}

// The first form of any the edit adds: more of it in the new text than in the text it replaces.
const added = (path: string, before: string, after: string): string | undefined =>
  TS.test(path) ? MARKERS.find(marker => count(marker.pattern, after) > count(marker.pattern, before))?.name : undefined

const reasonFor = async ($: EngineInterface, tool: string, input: unknown): Promise<string | undefined> => {
  const path = field(input, 'file_path')
  const what =
    tool === 'Edit'
      ? added(path, field(input, 'old_string'), field(input, 'new_string'))
      : tool === 'Write'
        ? added(path, '', field(input, 'content'))
        : undefined

  return what === undefined ? undefined : (await strings($)).confirm(what)
}

export const register: Register = on => {
  // Does not block: requires the person's confirmation, even when the edit is already allowed by permissions.
  on('tool.check', async ($, e, next) => {
    const verdict = await next(e)
    const reason = verdict.decision === 'allow' ? await reasonFor($, e.tool, e.input) : undefined

    return reason === undefined ? verdict : { decision: 'ask', reason }
  }).catch(() => ({ decision: 'ask', reason: STRINGS.en.failed }))
}
