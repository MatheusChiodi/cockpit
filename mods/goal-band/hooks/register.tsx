import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { row } from './kit'

// turbina: liga/desliga pelo painel /turbina
const OFF = { plugin: 'turbina', key: 'off' } as const

const isOff = async ($: EngineInterface): Promise<boolean> =>
  ((await $.state.get(OFF)).value ?? []).includes('goal-band')

const goal = atom({ plugin: 'goal-band', key: 'goal' } as const, '')

const keyOf = async ($: EngineInterface): Promise<string> => `goal:${await $.session.root()}`

const held = async ($: EngineInterface): Promise<string> => {
  const value = await $.store.get(await keyOf($))

  return typeof value === 'string' ? value : ''
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'goal',
      description: 'Fixa o objetivo do projeto acima do prompt e no contexto do Claude; /goal clear remove',
      argumentHint: '<objetivo> | clear',
    })
    const text = await held($)
    await update($, goal, () => text)

    return next(e)
  })

  on('command.run', { command: 'goal' }, async ($, e) => {
    const text = e.args.trim()

    if (text === '') {
      const current = await read($, goal)

      return { text: current === '' ? 'Sem objetivo. Use /goal <objetivo>.' : `Objetivo: ${current}` }
    }

    const next = text === 'clear' ? '' : text.slice(0, 200)
    await $.store.set(await keyOf($), next)
    await update($, goal, () => next)

    return { text: next === '' ? 'Objetivo removido.' : 'Objetivo fixado (o Claude passa a vê-lo no próximo prompt).' }
  })

  // O objetivo também entra no system prompt, para o Claude não se desviar dele.
  on('prompt.compose', async ($, e, next) => {
    const composed = await next(e)
    const text = await held($)

    return text === ''
      ? composed
      : {
          sections: [
            ...composed.sections,
            {
              id: 'goal-band:goal',
              text: `# Objetivo atual do usuário\n${text}\nMantenha o trabalho alinhado a esse objetivo e avise se um pedido se desviar dele.`,
              scope: 'session',
            },
          ],
        }
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const below = await next(e)
    const text = await read($, goal)

    if (e.props.hasSurvey || (await isOff($)) || text === '') {
      return below
    }

    const ui = $.ui.resolve(e)
    const { Text } = ui

    return row(
      ui,
      'dia',
      'objetivo',
      <Text bold wrap="truncate-end">
        {text}
      </Text>,
      below,
    )
  })
}
