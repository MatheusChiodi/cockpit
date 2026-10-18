import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

// Read once per module load: the build files do not change mid-session.
const cache: { java: boolean | undefined } = { java: undefined }

const detect = async ($: EngineInterface): Promise<boolean> => {
  const root = await $.session.root()

  for (const file of ['pom.xml', 'build.gradle', 'build.gradle.kts']) {
    if (typeof (await $.fs.read(`${root}/${file}`).catch(() => undefined)) === 'string') {
      return true
    }
  }

  return false
}

// A segment of the command line that starts with the build tool (after env assignments), asking for a build goal.
const BUILD = /^\s*(?:[A-Za-z_]\w*=\S*\s+)*(?:\.[\\/])?(mvnw?|gradlew?)(?:\.cmd|\.bat)?\s+(?:[^;&|]*\s)?(?:test|verify|package|install|build|check)\b/

const toolOf = (command: string): string | undefined => {
  for (const segment of command.split(/&&|\|\||[;|\n]/)) {
    const tool = BUILD.exec(segment)?.[1]

    if (tool !== undefined) {
      return tool
    }
  }

  return undefined
}

const took = (ms: number): string => (ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`)

type Outcome = { ok: boolean | undefined; tests: number | undefined; failed: number | undefined }

// What the build printed: Maven's and Gradle's own verdict line and their test totals.
const outcomeOf = (output: string): Outcome => {
  const ok = /BUILD (?:SUCCESS|SUCCESSFUL)\b/.test(output) ? true : /BUILD (?:FAILURE|FAILED)\b/.test(output) ? false : undefined
  const maven = [...output.matchAll(/^\[\w+\] Tests run: (\d+), Failures: (\d+), Errors: (\d+)(?:, Skipped: \d+)?\s*$/gm)].at(-1)
  const gradle = /(\d+) tests? completed, (\d+) failed/.exec(output)

  if (maven !== undefined) {
    return { ok, tests: Number(maven[1]), failed: Number(maven[2]) + Number(maven[3]) }
  }

  return gradle === null ? { ok, tests: undefined, failed: undefined } : { ok, tests: Number(gradle[1]), failed: Number(gradle[2]) }
}

const watch = async <R extends { deny?: string; isError?: boolean; text?: string }>(
  $: EngineInterface,
  command: string,
  run: () => Promise<R>,
): Promise<R> => {
  const tool = toolOf(command)

  if (tool === undefined) {
    return run()
  }

  cache.java ??= await detect($)

  if (!cache.java) {
    return run()
  }

  const label = tool.replace(/w$/, '')
  const s = await strings($)
  const startedAt = await $.clock.now()
  $.ui.status(`${label} …`)
  const ran = await run()
  const endedAt = await $.clock.now()

  if (ran.deny === undefined) {
    const outcome = outcomeOf(ran.text ?? '')
    const failed = outcome.ok === undefined ? ran.isError === true : !outcome.ok
    const at = new Date(endedAt).toLocaleTimeString(s.locale, { hour: '2-digit', minute: '2-digit' })
    const parts = [
      `${label} ${failed ? '✗' : '✓'} ${at}`,
      took(endedAt - startedAt),
      outcome.tests === undefined ? undefined : s.tests(outcome.tests),
      outcome.failed === undefined || outcome.failed === 0 ? undefined : s.failed(outcome.failed),
    ]

    $.ui.status(parts.filter(part => part !== undefined).join(' · '))
  }

  return ran
}

export const register: Register = on => {
  on('tool.call', { tool: 'Bash' }, ($, e, next) => watch($, e.command, () => next(e)))

  on('tool.call', { tool: 'PowerShell' }, ($, e, next) => watch($, e.command, () => next(e)))
}
