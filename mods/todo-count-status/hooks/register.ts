import type { EngineInterface, Register } from 'claude-code'

// cockpit: switched on and off in the /cockpit pane
const OFF = { plugin: 'cockpit', key: 'off' } as const

const isOff = async ($: EngineInterface): Promise<boolean> =>
  ((await $.state.get(OFF)).value ?? []).includes('todo-count-status')

const show = async ($: EngineInterface, text: string | undefined): Promise<void> => {
  $.ui.status((await isOff($)) ? undefined : text)
}

const TAGS = ['TODO', 'FIXME', 'HACK'] as const

// `git grep` only looks at tracked files: node_modules and builds stay out.
const refresh = async ($: EngineInterface): Promise<void> => {
  const ran = await $.process
    .run(['git', 'grep', '-I', '-o', '-h', '-w', '-E', TAGS.join('|')], { timeoutMs: 15000 })
    .catch(() => undefined)

  if (ran === undefined || ran.exitCode > 1) {
    void show($, undefined)

    return
  }

  const found = ran.stdout.split('\n')
  const parts = TAGS.map(tag => [tag, found.filter(line => line === tag).length] as const)
    .filter(([, count]) => count > 0)
    .map(([tag, count]) => `${tag.toLowerCase()} ${count}`)

  void show($, parts.length === 0 ? undefined : parts.join(' · '))
}

export const register: Register = on => {
  on('state.set', { plugin: 'cockpit', key: 'off' }, async ($, e, next) => {
    const set = await next(e)
    await show($, undefined)

    return set
  })

  on('session.start', ($, e, next) => {
    void refresh($)

    return next(e)
  })

  on('turn.complete', ($, e, next) => {
    void refresh($)

    return next(e)
  })
}
