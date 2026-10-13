import type { EngineInterface, Register } from 'claude-code'

const FENCE = /```[^\n]*\n([\s\S]*?)```/g

const lastAnswer = async ($: EngineInterface): Promise<string | undefined> =>
  (await $.session.messages()).findLast(message => message.role === 'assistant' && message.text.trim() !== '')
    ?.text

const copied = async ($: EngineInterface, text: string, what: string): Promise<{ text: string }> => {
  const { isCopied } = await $.ui.copy({ text })

  return {
    text: isCopied
      ? `${what} copiado (${text.length} caracteres).`
      : 'Não foi possível acessar a área de transferência nesta superfície.',
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'copy-last',
      description: 'Copia a última resposta do Claude para a área de transferência',
    })
    await $.command.register({
      name: 'copy-code',
      description: 'Copia o último bloco de código da última resposta',
    })

    return next(e)
  })

  on('command.run', { command: 'copy-last' }, async $ => {
    const answer = await lastAnswer($)

    return answer === undefined ? { text: 'Ainda não há resposta para copiar.' } : copied($, answer, 'Resposta')
  })

  on('command.run', { command: 'copy-code' }, async $ => {
    const answer = await lastAnswer($)
    const block = answer === undefined ? undefined : [...answer.matchAll(FENCE)].at(-1)?.[1]

    return block === undefined
      ? { text: 'A última resposta não tem bloco de código.' }
      : copied($, block.replace(/\n$/, ''), 'Código')
  })
}
