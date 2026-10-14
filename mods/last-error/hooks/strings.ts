const en = {
  command: 'Show the last shell command that failed this session and the end of its output',
  none: 'No shell command has failed this session.',
  noOutput: '(no output)',
}

type Strings = typeof en

const pt: Strings = {
  command: 'Mostra o último comando de shell que falhou nesta sessão e o final da sua saída',
  none: 'Nenhum comando de shell falhou nesta sessão.',
  noOutput: '(sem saída)',
}

const es: Strings = {
  command: 'Muestra el último comando de shell que falló en esta sesión y el final de su salida',
  none: 'Ningún comando de shell falló en esta sesión.',
  noOutput: '(sin salida)',
}

export const STRINGS = { en, pt, es }
