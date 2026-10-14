import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: switched on and off in the /cockpit pane
const OFF = { plugin: 'cockpit', key: 'off' } as const

const isOff = async ($: EngineInterface): Promise<boolean> =>
  ((await $.state.get(OFF)).value ?? []).includes('deploy-status')

const show = async ($: EngineInterface, text: string | undefined): Promise<void> => {
  $.ui.status((await isOff($)) ? undefined : text)
}

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

// Commands that ship the project somewhere: hosting CLIs, store submits, infra applies, a deploy script.
const DEPLOY_COMMAND =
  /\b(vercel\s+(?:deploy|--prod)|netlify\s+deploy|eas\s+(?:build|submit|update)|firebase\s+deploy|fly(?:ctl)?\s+deploy|wrangler\s+(?:deploy|publish)|serverless\s+deploy|sls\s+deploy|cdk\s+deploy|railway\s+up|(?:npm|pnpm|yarn)\s+(?:run\s+)?deploy|git\s+push\s+heroku|terraform\s+apply|helm\s+upgrade|kubectl\s+apply)\b/

const took = (ms: number): string => (ms >= 60000 ? `${Math.floor(ms / 60000)}m${Math.round((ms % 60000) / 1000)}s` : ms >= 1000 ? `${(ms / 1000).toFixed(0)}s` : `${ms}ms`)

// The first word names the target: vercel, eas, firebase. A git push to heroku is heroku.
const targetOf = (found: string): string => {
  const word = found.split(/\s+/)[0] ?? found

  return word === 'git' ? 'heroku' : word
}

// The last deploy stays on the status line until the next one: green or red always in sight.
const watch = async <R extends { deny?: string; isError?: boolean }>(
  $: EngineInterface,
  command: string,
  run: () => Promise<R>,
): Promise<R> => {
  const found = DEPLOY_COMMAND.exec(command)?.[1]

  if (found === undefined) {
    return run()
  }

  const s = await strings($)
  const target = targetOf(found)
  const startedAt = await $.clock.now()
  void show($, `${s.label} ${target} …`)
  const ran = await run()
  const endedAt = await $.clock.now()

  if (ran.deny === undefined) {
    const at = new Date(endedAt).toLocaleTimeString(s.locale, { hour: '2-digit', minute: '2-digit' })
    void show($, `${s.label} ${ran.isError === true ? '✗' : '✓'} ${target} ${at} · ${took(endedAt - startedAt)}`)
  }

  return ran
}

export const register: Register = on => {
  // A status line entry is not redrawn by a state change: clear it when the hub's switch moves.
  on('state.set', { plugin: 'cockpit', key: 'off' }, async ($, e, next) => {
    const set = await next(e)
    await show($, undefined)

    return set
  })

  on('tool.call', { tool: 'Bash' }, ($, e, next) => watch($, e.command, () => next(e)))

  on('tool.call', { tool: 'PowerShell' }, ($, e, next) => watch($, e.command, () => next(e)))
}
