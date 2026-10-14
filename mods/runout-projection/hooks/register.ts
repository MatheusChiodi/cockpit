import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

type Strings = (typeof STRINGS)['en']

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const MINUTE = 60000
// A pace needs time and movement behind it.
const MIN_MS = 10 * MINUTE
const MIN_POINTS = 2

// Where each window was first seen and where it stands now. Module state: a reload drops it.
type Track = { at: number; percent: number; now: number; latest: number; resetsAt: number | undefined; isWarned: boolean }

const tracks = new Map<string, Track>()

const span = (ms: number): string => {
  const minutes = Math.max(1, Math.round(ms / MINUTE))

  return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m` : `${minutes}m`
}

// Milliseconds until the window is full at the pace seen since it was first read; undefined without a pace.
const runsOutIn = (track: Track): number | undefined => {
  const elapsed = track.now - track.at
  const gained = track.latest - track.percent

  return elapsed < MIN_MS || gained < MIN_POINTS ? undefined : ((100 - track.latest) * elapsed) / gained
}

const resetNote = (s: Strings, track: Track): string =>
  track.resetsAt === undefined ? '' : s.reset(span(track.resetsAt - track.now))

// True when the projection falls before the window's own reset.
const isShort = (track: Track, left: number): boolean => track.resetsAt === undefined || track.now + left < track.resetsAt

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'runout', description: (await strings($)).command })

    return next(e)
  })

  on('session.measure', async ($, e, next) => {
    const now = await $.clock.now()
    const s = await strings($)

    for (const limit of e.rateLimits) {
      const held = tracks.get(limit.kind)
      const resetsAt = limit.resetsAt === undefined ? undefined : Date.parse(limit.resetsAt)
      // A lower reading means the window reset: start its pace again.
      const track: Track =
        held === undefined || limit.percentUsed < held.latest
          ? { at: now, percent: limit.percentUsed, now, latest: limit.percentUsed, resetsAt, isWarned: false }
          : { ...held, now, latest: limit.percentUsed, resetsAt }
      tracks.set(limit.kind, track)

      const left = runsOutIn(track)

      if (left !== undefined && !track.isWarned && isShort(track, left)) {
        track.isWarned = true
        $.ui.toast(s.toast(s.windows[limit.kind] ?? limit.kind, Math.round(limit.percentUsed), span(left), resetNote(s, track)), {
          timeoutMs: 12000,
        })
      }
    }

    return next(e)
  })

  on('command.run', { command: 'runout' }, async $ => {
    const s = await strings($)

    if (tracks.size === 0) {
      return { text: s.none }
    }

    return {
      text: [...tracks]
        .map(([kind, track]) => {
          const label = s.windows[kind] ?? kind
          const percent = Math.round(track.latest)
          const left = runsOutIn(track)

          return left === undefined
            ? s.waiting(label, percent)
            : isShort(track, left)
              ? s.runs(label, percent, span(left), resetNote(s, track))
              : s.lasts(label, percent)
        })
        .join('\n'),
    }
  })
}
