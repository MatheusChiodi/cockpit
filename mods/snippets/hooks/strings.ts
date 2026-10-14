const en = {
  command: 'Reusable prompt snippets kept across sessions: save, use by name, list, remove',
  hint: 'save <name> <text> | <name> | list | rm <name>',
  usage: 'Usage: /snip save <name> <text>  |  /snip <name>  |  /snip list  |  /snip rm <name>',
  badName: 'Names use letters, digits, "-", "_" and "." (up to 40) and cannot be save, list or rm.',
  noText: (name: string) => `Nothing to save in "${name}": type the text after the name, or select it first.`,
  saved: (name: string) => `Snippet "${name}" saved.`,
  updated: (name: string) => `Snippet "${name}" updated.`,
  missing: (name: string) => `No snippet named "${name}". /snip list shows them.`,
  removed: (name: string) => `Snippet "${name}" removed.`,
  empty: 'No snippets yet. Save one with /snip save <name> <text>.',
  filled: (name: string) => `Snippet "${name}" is in the prompt box.`,
  notFilled: 'The prompt box could not take the snippet right now.',
}

type Strings = typeof en

const pt: Strings = {
  command: 'Trechos de prompt reutilizáveis entre sessões: salvar, usar pelo nome, listar, remover',
  hint: 'save <nome> <texto> | <nome> | list | rm <nome>',
  usage: 'Uso: /snip save <nome> <texto>  |  /snip <nome>  |  /snip list  |  /snip rm <nome>',
  badName: 'Nomes usam letras, números, "-", "_" e "." (até 40) e não podem ser save, list ou rm.',
  noText: name => `Nada para salvar em "${name}": digite o texto depois do nome ou selecione-o antes.`,
  saved: name => `Trecho "${name}" salvo.`,
  updated: name => `Trecho "${name}" atualizado.`,
  missing: name => `Não há trecho chamado "${name}". /snip list mostra os existentes.`,
  removed: name => `Trecho "${name}" removido.`,
  empty: 'Nenhum trecho ainda. Salve um com /snip save <nome> <texto>.',
  filled: name => `O trecho "${name}" está na caixa do prompt.`,
  notFilled: 'A caixa do prompt não pôde receber o trecho agora.',
}

const es: Strings = {
  command: 'Fragmentos de prompt reutilizables entre sesiones: guardar, usar por nombre, listar, borrar',
  hint: 'save <nombre> <texto> | <nombre> | list | rm <nombre>',
  usage: 'Uso: /snip save <nombre> <texto>  |  /snip <nombre>  |  /snip list  |  /snip rm <nombre>',
  badName: 'Los nombres usan letras, dígitos, "-", "_" y "." (hasta 40) y no pueden ser save, list ni rm.',
  noText: name => `Nada que guardar en "${name}": escribe el texto después del nombre o selecciónalo antes.`,
  saved: name => `Fragmento "${name}" guardado.`,
  updated: name => `Fragmento "${name}" actualizado.`,
  missing: name => `No hay un fragmento llamado "${name}". /snip list muestra los existentes.`,
  removed: name => `Fragmento "${name}" borrado.`,
  empty: 'Todavía no hay fragmentos. Guarda uno con /snip save <nombre> <texto>.',
  filled: name => `El fragmento "${name}" está en la caja del prompt.`,
  notFilled: 'La caja del prompt no pudo recibir el fragmento ahora.',
}

export const STRINGS = { en, pt, es }
