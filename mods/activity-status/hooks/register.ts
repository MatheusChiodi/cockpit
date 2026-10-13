import type { EngineInterface, Register } from 'claude-code'

// turbina: liga/desliga pelo painel /turbina
const OFF = { plugin: 'turbina', key: 'off' } as const

const isOff = async ($: EngineInterface): Promise<boolean> =>
  ((await $.state.get(OFF)).value ?? []).includes('activity-status')

const show = async ($: EngineInterface, text: string | undefined): Promise<void> => {
  $.ui.status((await isOff($)) ? undefined : text)
}

const base = (path: string): string => path.split(/[\\/]/).at(-1) ?? path

// O que resume cada chamada: o comando, o arquivo, o padrão buscado ou a descrição.
const detail = (input: Readonly<Record<string, unknown>>): string => {
  const pick = (key: string): string | undefined =>
    typeof input[key] === 'string' ? (input[key] as string) : undefined
  const path = pick('file_path') ?? pick('notebook_path')

  return (
    pick('command')?.replace(/\s+/g, ' ') ??
    (path === undefined ? undefined : base(path)) ??
    pick('pattern') ??
    pick('description') ??
    pick('url') ??
    pick('query') ??
    ''
  ).slice(0, 56)
}

export const register: Register = on => {
  on('state.set', { plugin: 'turbina', key: 'off' }, async ($, e, next) => {
    const set = await next(e)
    await show($, undefined)

    return set
  })

  // Chamadas em paralelo: a status line mostra a mais recente ainda rodando.
  const running = new Map<string, string>()

  on('tool.call', async ($, e, next) => {
    // Só o loop principal: subagentes têm a própria linha.
    if (e.agentId !== undefined) {
      return next(e)
    }

    const what = detail(e as unknown as Readonly<Record<string, unknown>>)
    running.set(e.tool_use_id, `▶ ${String(e.tool)}${what === '' ? '' : `: ${what}`}`)
    void show($, [...running.values()].at(-1))

    try {
      return await next(e)
    } finally {
      running.delete(e.tool_use_id)
      void show($, [...running.values()].at(-1))
    }
  })

  on('turn.complete', ($, e, next) => {
    if (e.agentId === undefined) {
      running.clear()
      void show($, undefined)
    }

    return next(e)
  })
}
