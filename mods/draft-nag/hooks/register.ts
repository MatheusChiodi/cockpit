import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

type Draft = { number?: number; title?: string; updatedAt?: string }

const DAY_MS = 86400000
const STALE_DAYS = 3
const CHECK_MS = 6 * 3600000
const TOAST_MS = 12000

// The drafts the person was already told about this session.
const told: { numbers: Set<number> } = { numbers: new Set() }

// Needs the authenticated GitHub CLI (`gh`); without it, or with no stale draft, it says nothing.
const check = async ($: EngineInterface): Promise<void> => {
  const ran = await $.process
    .run(['gh', 'pr', 'list', '--author', '@me', '--state', 'open', '--draft', '--json', 'number,title,updatedAt'], {
      timeoutMs: 20000,
    })
    .catch(() => undefined)
  let drafts: Draft[] = []

  try {
    drafts = ran?.exitCode === 0 ? (JSON.parse(ran.stdout) as Draft[]) : []
  } catch {
    drafts = []
  }

  const now = await $.clock.now()
  const stale = drafts
    .filter(draft => draft.number !== undefined && !told.numbers.has(draft.number))
    .map(draft => ({ draft, days: Math.floor((now - Date.parse(draft.updatedAt ?? '')) / DAY_MS) }))
    .filter(found => found.days >= STALE_DAYS)
    .sort((a, b) => b.days - a.days)

  const oldest = stale[0]

  if (oldest === undefined) {
    return
  }

  for (const found of stale) {
    told.numbers.add(found.draft.number ?? 0)
  }

  const s = await strings($)
  $.ui.toast(s.nag(oldest.draft.number ?? 0, oldest.draft.title ?? '', oldest.days, stale.length - 1), { timeoutMs: TOAST_MS })
}

export const register: Register = on => {
  on('session.start', ($, e, next) => {
    told.numbers = new Set()
    void check($)
    $.clock.every(CHECK_MS, () => void check($))

    return next(e)
  })
}
