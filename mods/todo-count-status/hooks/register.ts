import type { EngineInterface, Register } from 'claude-code'

// turbina: liga/desliga pelo painel /turbina
const OFF = { plugin: 'turbina', key: 'off' } as const

const isOff = async ($: EngineInterface): Promise<boolean> =>
  ((await $.state.get(OFF)).value ?? []).includes('todo-count-status')

const show = async ($: EngineInterface, text: string | undefined): Promise<void> => {
  $.ui.status((await isOff($)) ? undefined : text)
}

const TAGS = ['TODO', 'FIXME', 'HACK'] as const

// `git grep` só olha arquivos versionados: node_modules e builds ficam de fora.
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
    .map(([tag, count]) => `${tag} ${count}`)

  void show($, parts.length === 0 ? undefined : parts.join(' · '))
}

export const register: Register = on => {
  on('state.set', { plugin: 'turbina', key: 'off' }, async ($, e, next) => {
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
