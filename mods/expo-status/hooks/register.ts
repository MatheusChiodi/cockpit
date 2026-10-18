import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const readJson = async ($: EngineInterface, path: string): Promise<Record<string, unknown>> => {
  const text = await $.fs.read(path).catch(() => undefined)

  try {
    const parsed: unknown = JSON.parse(typeof text === 'string' ? text : '{}')

    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

const object = (value: unknown): Record<string, unknown> => (typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {})

// The Expo SDK major: app.json sdkVersion first, then the version range of the expo dependency.
const sdkOf = (manifest: Record<string, unknown>, app: Record<string, unknown>): string | undefined => {
  const declared = object(app.expo).sdkVersion
  const range = object(manifest.dependencies).expo ?? object(manifest.devDependencies).expo

  return /\d+/.exec(typeof declared === 'string' ? declared : '')?.[0] ?? /\d+/.exec(typeof range === 'string' ? range : '')?.[0]
}

// Shows the SDK and the EAS build profiles of an Expo project; nothing in any other project.
const show = async ($: EngineInterface): Promise<void> => {
  const root = await $.session.root()
  const manifest = await readJson($, `${root}/package.json`)
  const isExpo = 'expo' in object(manifest.dependencies) || 'expo' in object(manifest.devDependencies)

  if (!isExpo) {
    return
  }

  const sdk = sdkOf(manifest, await readJson($, `${root}/app.json`))
  const profiles = Object.keys(object((await readJson($, `${root}/eas.json`)).build)).slice(0, 4)
  const s = await strings($)

  $.ui.status(`${s.label}${sdk === undefined ? '' : ` ${sdk}`}${profiles.length === 0 ? '' : ` · eas ${s.profiles} ${profiles.join('/')}`}`)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await show($)

    return next(e)
  })
}
