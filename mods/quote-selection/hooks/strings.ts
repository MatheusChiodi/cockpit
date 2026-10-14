const en = {
  command: 'Quote in the prompt the text selected with the mouse (fullscreen mode)',
  nothing: 'Nothing selected. Select a passage with the mouse and run /quote.',
  quoted: 'Selection quoted in the prompt.',
  failed: 'Could not write to the prompt right now.',
}

type Strings = typeof en

const pt: Strings = {
  command: 'Cita no prompt o texto selecionado com o mouse (modo fullscreen)',
  nothing: 'Nada selecionado. Selecione um trecho com o mouse e rode /quote.',
  quoted: 'Seleção citada no prompt.',
  failed: 'Não foi possível escrever no prompt agora.',
}

const es: Strings = {
  command: 'Cita en el prompt el texto seleccionado con el ratón (modo fullscreen)',
  nothing: 'Nada seleccionado. Selecciona un fragmento con el ratón y ejecuta /quote.',
  quoted: 'Selección citada en el prompt.',
  failed: 'No se pudo escribir en el prompt ahora.',
}

export const STRINGS = { en, pt, es }
