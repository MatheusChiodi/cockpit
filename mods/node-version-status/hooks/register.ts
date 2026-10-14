import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

// The Node version the project asks for: engines.node first, then the version files.
const wanted = async ($: EngineInterface, root: string): Promise<string | undefined> => {
  const manifest = await $.fs.read(`${root}/package.json`).catch(() => undefined)

  try {
    const range = (JSON.parse(typeof manifest === 'string' ? manifest : '{}') as { engines?: { node?: unknown } }).engines?.node

    if (typeof range === 'string' && range.trim() !== '') {
      return range.trim()
    }
  } catch {
    // Invalid package.json: the version files decide.
  }

  for (const file of ['.nvmrc', '.node-version']) {
    const text = await $.fs.read(`${root}/${file}`).catch(() => undefined)
    const version = typeof text === 'string' ? text.trim().replace(/^v/, '') : ''

    // lts/* and other aliases name no number to compare.
    if (/^\d/.test(version)) {
      return version
    }
  }

  const tools = await $.fs.read(`${root}/.tool-versions`).catch(() => undefined)

  return typeof tools === 'string' ? /^\s*nodejs\s+v?(\d[\w.]*)/m.exec(tools)?.[1] : undefined
}

const COMPARATOR = /(>=|<=|>|<|\^|~|=)?\s*v?(\d+)(?:\.[\dxX*]+)*/g

// Whether a Node major satisfies a semver range, judged by majors only. A range it cannot read is satisfied.
const satisfies = (major: number, range: string): boolean =>
  range.split('||').some(alternative => {
    const span = /v?(\d+)[\d.xX*]*\s+-\s+v?(\d+)/.exec(alternative)

    if (span !== null) {
      return major >= Number(span[1]) && major <= Number(span[2])
    }

    const comparators = [...alternative.matchAll(COMPARATOR)]

    return comparators.every(match => {
      const wantedMajor = Number(match[2])

      switch (match[1]) {
        case '>=':
          return major >= wantedMajor
        case '>':
          return major > wantedMajor
        case '<=':
          return major <= wantedMajor
        case '<':
          return major < wantedMajor
        default:
          return major === wantedMajor
      }
    })
  })

// Shows the entry when the Node in use is outside what the project asks for; clears it otherwise.
const check = async ($: EngineInterface): Promise<void> => {
  const root = await $.session.root()
  const want = await wanted($, root)
  const ran = want === undefined ? undefined : await $.process.run(['node', '--version'], { timeoutMs: 5000 }).catch(() => undefined)
  const running = ran?.exitCode === 0 ? ran.stdout.trim().replace(/^v/, '') : ''
  const major = Number(running.split('.')[0])

  if (want === undefined || running === '' || Number.isNaN(major) || satisfies(major, want)) {
    return
  }

  const s = await strings($)
  $.ui.status(`${s.label} ${running} ✗ ${s.wants} ${want}`)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await check($)

    return next(e)
  })
}
