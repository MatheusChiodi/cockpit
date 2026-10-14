import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const TOAST_MS = 8000
const FIRST = 500
const STEP = 100

const CODE = /\.(?:[cm]?[jt]sx?|py|java|kt|kts|go|rs|cs|scala|vue|svelte|php|rb)$/i
const TEST_FILE = /[.\-_](?:test|spec)\.|(?:^|[\\/])(?:tests?|__tests__)[\\/]|Tests?\.(?:java|kt|cs)$/i

// The last length, in steps of STEP, a file was announced at.
const announced = new Map<string, number>()

const nameOf = (path: string): string => path.replaceAll('\\', '/').split('/').pop() ?? path

const check = async ($: EngineInterface, path: string): Promise<void> => {
  if (!CODE.test(path) || TEST_FILE.test(path)) {
    return
  }

  const text = await $.fs.read(path).catch(() => undefined)

  if (typeof text !== 'string') {
    return
  }

  const lines = text.split('\n').length
  const step = Math.floor(lines / STEP)

  if (lines < FIRST) {
    announced.delete(path)

    return
  }

  if (step > (announced.get(path) ?? FIRST / STEP - 1)) {
    announced.set(path, step)
    const s = await strings($)
    $.ui.toast(s.long(nameOf(path), lines), { timeoutMs: TOAST_MS })
  }
}

export const register: Register = on => {
  on('tool.call', { tool: 'Edit' }, async ($, e, next) => {
    const ran = await next(e)

    if (ran.deny === undefined && ran.isError !== true) {
      await check($, e.file_path)
    }

    return ran
  })

  on('tool.call', { tool: 'Write' }, async ($, e, next) => {
    const ran = await next(e)

    if (ran.deny === undefined && ran.isError !== true) {
      await check($, e.file_path)
    }

    return ran
  })
}
