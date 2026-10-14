import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const LINES = 12
const WIDTH = 120

// The typed URL, else the mouse selection, else ''.
const input = async ($: EngineInterface, args: string): Promise<string> => {
  if (args.trim() !== '') {
    return args.trim()
  }

  try {
    return ((await $.ui.selection())?.text ?? '').trim()
  } catch {
    return ''
  }
}

const size = (bytes: number): string =>
  bytes < 1024 ? `${bytes}` : bytes < 1048576 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1048576).toFixed(1)} MB`

const head = (text: string): string[] =>
  text
    .split(/\r?\n/)
    .slice(0, LINES)
    .map(line => (line.length > WIDTH ? `${line.slice(0, WIDTH - 3)}...` : line))

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const s = await strings($)
    await $.command.register({ name: 'http', description: s.command, argumentHint: s.hint })

    return next(e)
  })

  on('command.run', { command: 'http' }, async ($, e) => {
    const s = await strings($)
    const url = await input($, e.args)

    if (!/^https?:\/\/\S+$/i.test(url)) {
      return { text: s.usage }
    }

    try {
      const response = await $.http.fetch(url)
      const bytes = new TextEncoder().encode(response.text).length
      const body = response.text === '' ? [s.empty] : head(response.text)
      const rows = [
        [s.status, String(response.status)],
        [s.type, response.headers['content-type'] ?? '-'],
        [s.size, `${size(bytes)}${bytes < 1024 ? ` ${s.bytes}` : ''}`],
      ]
      const width = Math.max(...rows.map(([label]) => (label ?? '').length))

      return { text: [...rows.map(([label, value]) => `${(label ?? '').padEnd(width)}  ${value}`), '', ...body].join('\n') }
    } catch (error) {
      return { text: s.failed(error instanceof Error ? error.message : String(error)) }
    }
  })
}
