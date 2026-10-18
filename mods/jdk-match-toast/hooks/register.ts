import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

// Read once per module load: the build file does not change mid-session.
const cache: { declared: { file: string; major: number } | null | undefined } = { declared: undefined }

// 1.8 is Java 8; 11 is Java 11.
const majorOf = (raw: string): number => {
  const parts = raw.replace(/_/g, '.').split('.')
  const first = Number(parts[0])

  return first === 1 ? Number(parts[1]) : first
}

const POM = /<(?:java\.version|maven\.compiler\.(?:source|target|release)|release|source|target)>\s*(\d+(?:\.\d+)?)\s*</g
const GRADLE = [
  /\b(?:source|target)Compatibility\s*=?\s*['"]?(?:JavaVersion\.VERSION_)?(\d+(?:[._]\d+)?)/g,
  /\bjvmToolchain\s*\(\s*(\d+)/g,
  /JavaLanguageVersion\.of\(\s*(\d+)/g,
]

// The highest JDK the build file asks for; null when it names none.
const detect = async ($: EngineInterface): Promise<{ file: string; major: number } | null> => {
  const root = await $.session.root()

  for (const file of ['pom.xml', 'build.gradle', 'build.gradle.kts']) {
    const text = await $.fs.read(`${root}/${file}`).catch(() => undefined)

    if (typeof text !== 'string') {
      continue
    }

    const patterns = file === 'pom.xml' ? [POM] : GRADLE
    const majors = patterns.flatMap(pattern => [...text.matchAll(pattern)].map(match => majorOf(match[1] ?? ''))).filter(major => major > 0)

    if (majors.length > 0) {
      return { file, major: Math.max(...majors) }
    }
  }

  return null
}

// The major version of the java on the PATH: `java -version` prints to stderr.
const installed = async ($: EngineInterface): Promise<number | undefined> => {
  const ran = await $.process.run(['java', '-version'], { timeoutMs: 5000 }).catch(() => undefined)
  const version = /version "(\d+(?:[._]\d+)?)/.exec(`${ran?.stderr ?? ''}\n${ran?.stdout ?? ''}`)?.[1]
  const major = version === undefined ? NaN : majorOf(version)

  return Number.isNaN(major) ? undefined : major
}

const check = async ($: EngineInterface): Promise<void> => {
  cache.declared ??= await detect($)

  if (cache.declared === null) {
    return
  }

  const running = await installed($)

  if (running !== undefined && running < cache.declared.major) {
    $.ui.toast((await strings($)).older(cache.declared.file, cache.declared.major, running), { timeoutMs: 8000 })
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await check($)

    return next(e)
  })
}
