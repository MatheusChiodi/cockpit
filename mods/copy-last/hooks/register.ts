import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const FENCE = /```[^\n]*\n([\s\S]*?)```/g

const lastAnswer = async ($: EngineInterface): Promise<string | undefined> =>
  (await $.session.messages()).findLast(message => message.role === 'assistant' && message.text.trim() !== '')
    ?.text

const copied = async ($: EngineInterface, text: string, kind: 'answer' | 'code'): Promise<{ text: string }> => {
  const s = await strings($)
  const { isCopied } = await $.ui.copy({ text })

  return { text: isCopied ? s.copied(s[kind], text.length) : s.noClipboard }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const s = await strings($)
    await $.command.register({ name: 'copy-last', description: s.lastCommand })
    await $.command.register({ name: 'copy-code', description: s.codeCommand })

    return next(e)
  })

  on('command.run', { command: 'copy-last' }, async $ => {
    const answer = await lastAnswer($)

    return answer === undefined ? { text: (await strings($)).noAnswer } : copied($, answer, 'answer')
  })

  on('command.run', { command: 'copy-code' }, async $ => {
    const answer = await lastAnswer($)
    const block = answer === undefined ? undefined : [...answer.matchAll(FENCE)].at(-1)?.[1]

    return block === undefined
      ? { text: (await strings($)).noBlock }
      : copied($, block.replace(/\n$/, ''), 'code')
  })
}
