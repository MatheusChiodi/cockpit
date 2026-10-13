import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { row } from './kit'

import type { Mood } from '../types'

// turbina: liga/desliga pelo painel /turbina
const OFF = { plugin: 'turbina', key: 'off' } as const

const isOff = async ($: EngineInterface): Promise<boolean> =>
  ((await $.state.get(OFF)).value ?? []).includes('terminal-pet')

const mood = atom({ plugin: 'terminal-pet', key: 'mood' } as const, 'idle')

const FACES: Record<Mood, { face: string; line: string }> = {
  idle: { face: '(•ᴗ•)', line: 'pronto quando você estiver' },
  working: { face: '(•̀ᴗ•́)', line: 'trabalhando…' },
  happy: { face: '(＾▽＾)', line: 'deu certo!' },
  sad: { face: '(╥﹏╥)', line: 'algo falhou, vamos de novo' },
  sleepy: { face: '(－_－) zZ', line: 'faz tempo que ninguém fala comigo' },
}

const SLEEP_AFTER_MS = 5 * 60000

const state = { failed: false, idleSince: 0 }

const feel = ($: EngineInterface, next: Mood) => update($, mood, held => (held === next ? held : next))

const doze = async ($: EngineInterface): Promise<void> => {
  if (state.idleSince > 0 && (await $.clock.now()) - state.idleSince >= SLEEP_AFTER_MS) {
    await feel($, 'sleepy')
  }
}

export const register: Register = on => {
  on('session.start', ($, e, next) => {
    $.clock.every(30000, () => void doze($))

    return next(e)
  })

  on('turn.start', async ($, e, next) => {
    state.failed = false
    state.idleSince = 0
    await feel($, 'working')

    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    const ran = await next(e)

    if (e.agentId === undefined && ran.deny === undefined && ran.isError === true) {
      state.failed = true
    }

    return ran
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId === undefined) {
      state.idleSince = await $.clock.now()
      await feel($, e.reason !== 'answer' || state.failed ? 'sad' : 'happy')
    }

    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const below = await next(e)
    const now = FACES[await read($, mood)]

    if (e.props.hasSurvey || (await isOff($)) || now === undefined) {
      return below
    }

    const ui = $.ui.resolve(e)
    const { Text } = ui

    return row(
      ui,
      'dia',
      'pet',
      <Text>
        <Text color="remember">{now.face}</Text>
        <Text dimColor>  {now.line}</Text>
      </Text>,
      below,
    )
  })
}
