const en = {
  command: 'Save the conversation so far as Markdown under .claude-exports in the project',
  hint: '[file]',
  nothing: 'The conversation is empty: nothing to save.',
  saved: (count: number, path: string) => `Saved ${count} message(s) to:\n${path}`,
  failed: (message: string) => `Could not write the file: ${message}`,
  title: 'Session export',
  project: 'Project',
  date: 'Date',
  messages: 'Messages',
  user: 'You',
  assistant: 'Claude',
  tools: (names: string) => `Tools: ${names}`,
}

type Strings = typeof en

const pt: Strings = {
  command: 'Salva a conversa até agora em Markdown em .claude-exports no projeto',
  hint: '[arquivo]',
  nothing: 'A conversa está vazia: nada para salvar.',
  saved: (count, path) => `${count} mensagem(ns) salva(s) em:\n${path}`,
  failed: message => `Não foi possível gravar o arquivo: ${message}`,
  title: 'Exportação da sessão',
  project: 'Projeto',
  date: 'Data',
  messages: 'Mensagens',
  user: 'Você',
  assistant: 'Claude',
  tools: names => `Ferramentas: ${names}`,
}

const es: Strings = {
  command: 'Guarda la conversación hasta ahora en Markdown en .claude-exports del proyecto',
  hint: '[archivo]',
  nothing: 'La conversación está vacía: nada que guardar.',
  saved: (count, path) => `${count} mensaje(s) guardado(s) en:\n${path}`,
  failed: message => `No se pudo escribir el archivo: ${message}`,
  title: 'Exportación de la sesión',
  project: 'Proyecto',
  date: 'Fecha',
  messages: 'Mensajes',
  user: 'Tú',
  assistant: 'Claude',
  tools: names => `Herramientas: ${names}`,
}

export const STRINGS = { en, pt, es }
