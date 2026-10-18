import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Doing } from '../types'

const doing = atom({ plugin: 'spinner-doing', key: 'doing' } as const, null)

// The arguments that say best what a call is about, first one present wins.
const KEYS = ['command', 'file_path', 'path', 'pattern', 'url', 'query', 'description'] as const

const WIDTH = 48

const label = (tool: string, input: Record<string, unknown>): string => {
  const key = KEYS.find(name => typeof input[name] === 'string' && input[name] !== '')
  const target = key === undefined ? '' : String(input[key]).replace(/\s+/g, ' ')
  const text = `${tool} ${target}`.trim()

  return text.length > WIDTH ? `${text.slice(0, WIDTH - 1)}…` : text
}

export const register: Register = on => {
  // The spinner says only that the turn is running; the call that runs is known here.
  on('tool.call', async ($, e, next) => {
    if (e.agentId !== undefined) {
      return next(e)
    }

    const mine: Doing = { id: e.tool_use_id, label: label(String(e.tool), e as unknown as Record<string, unknown>) }
    await update($, doing, () => mine)

    try {
      return await next(e)
    } finally {
      await update($, doing, (now: Doing): Doing => (now?.id === mine.id ? null : now))
    }
  })

  on('ui.render', { component: 'Spinner' }, async ($, e, next) => {
    const now = await read($, doing)

    if (now === null || e.props.message !== null || e.props.mode === 'thinking') {
      return next(e)
    }

    return next({ ...e, props: { ...e.props, suffix: `… ${now.label}` } })
  })
}
