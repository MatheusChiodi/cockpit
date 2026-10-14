import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: switched on and off in the /cockpit pane
const OFF = { plugin: 'cockpit', key: 'off' } as const

const isOff = async ($: EngineInterface): Promise<boolean> =>
  ((await $.state.get(OFF)).value ?? []).includes('review-queue')

const show = async ($: EngineInterface, text: string | undefined): Promise<void> => {
  $.ui.status((await isOff($)) ? undefined : text)
}

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

type Requested = { number?: number; title?: string }

const CHECK_MS = 5 * 60000
const TOAST_MS = 10000
const MAX_TITLE = 40

// The pull requests already known this session; null until the first look, which never toasts.
const known: { numbers: Set<number> | null } = { numbers: null }

const cut = (title: string) => (title.length > MAX_TITLE ? `${title.slice(0, MAX_TITLE - 1)}…` : title)

// Needs the authenticated GitHub CLI (`gh`); without it, or with nothing waiting, it shows nothing.
const refresh = async ($: EngineInterface): Promise<void> => {
  const ran = await $.process
    .run(['gh', 'search', 'prs', '--review-requested=@me', '--state=open', '--json', 'number,title', '--limit', '30'], {
      timeoutMs: 20000,
    })
    .catch(() => undefined)
  let waiting: Requested[] = []

  try {
    waiting = ran?.exitCode === 0 ? (JSON.parse(ran.stdout) as Requested[]) : []
  } catch {
    waiting = []
  }

  waiting = waiting.filter(pr => pr.number !== undefined)

  if (waiting.length === 0) {
    known.numbers = ran?.exitCode === 0 ? new Set() : known.numbers
    void show($, undefined)

    return
  }

  const s = await strings($)
  const fresh = known.numbers === null ? [] : waiting.filter(pr => !known.numbers?.has(pr.number ?? 0))
  known.numbers = new Set(waiting.map(pr => pr.number ?? 0))

  for (const pr of fresh) {
    $.ui.toast(s.incoming(pr.number ?? 0, cut(pr.title ?? '')), { timeoutMs: TOAST_MS })
  }

  const first = waiting[0]

  void show($, `${s.label} ${waiting.length} · #${first?.number} ${cut(first?.title ?? '')}`.trimEnd())
}

export const register: Register = on => {
  // A status line entry is not redrawn by a state change: clear it when the hub's switch moves.
  on('state.set', { plugin: 'cockpit', key: 'off' }, async ($, e, next) => {
    const set = await next(e)
    await show($, undefined)

    return set
  })

  on('session.start', ($, e, next) => {
    known.numbers = null
    void refresh($)
    $.clock.every(CHECK_MS, () => void refresh($))

    return next(e)
  })
}
