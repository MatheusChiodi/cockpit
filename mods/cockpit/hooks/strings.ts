const en = {
  command: 'Cockpit settings: switch panels on and off and pick the language',
  hint: '[on|off <panel|all>] | [lang en|pt|es]',
  title: 'cockpit',
  summary: (on: number, total: number) => `${on} of ${total} panels on`,
  opened: (summary: string) => `${summary}. Enter or click toggles; Esc closes.`,
  allOn: 'All on',
  allOff: 'All off',
  language: 'Language',
  switched: (name: string, isOn: boolean, summary: string) => `${name} ${isOn ? 'on' : 'off'}. ${summary}.`,
  unknownPanel: (name: string) => `Unknown panel: ${name}. Run /cockpit to see the list.`,
  languageSet: 'Language set to English. Command descriptions follow on the next session.',
  unknownLanguage: (name: string) => `Unknown language: ${name}. Use en, pt or es.`,
}

type Strings = typeof en

const pt: Strings = {
  command: 'Configurações da Cockpit: liga e desliga painéis e escolhe o idioma',
  hint: '[on|off <painel|all>] | [lang en|pt|es]',
  title: 'cockpit',
  summary: (on, total) => `${on} de ${total} painéis ligados`,
  opened: summary => `${summary}. Enter ou clique alterna; Esc fecha.`,
  allOn: 'Ligar todos',
  allOff: 'Desligar todos',
  language: 'Idioma',
  switched: (name, isOn, summary) => `${name} ${isOn ? 'ligado' : 'desligado'}. ${summary}.`,
  unknownPanel: name => `Painel desconhecido: ${name}. Rode /cockpit para ver a lista.`,
  languageSet: 'Idioma definido para português. As descrições dos comandos mudam na próxima sessão.',
  unknownLanguage: name => `Idioma desconhecido: ${name}. Use en, pt ou es.`,
}

const es: Strings = {
  command: 'Ajustes de Cockpit: activa y desactiva paneles y elige el idioma',
  hint: '[on|off <panel|all>] | [lang en|pt|es]',
  title: 'cockpit',
  summary: (on, total) => `${on} de ${total} paneles activos`,
  opened: summary => `${summary}. Enter o clic alterna; Esc cierra.`,
  allOn: 'Activar todos',
  allOff: 'Desactivar todos',
  language: 'Idioma',
  switched: (name, isOn, summary) => `${name} ${isOn ? 'activado' : 'desactivado'}. ${summary}.`,
  unknownPanel: name => `Panel desconocido: ${name}. Ejecuta /cockpit para ver la lista.`,
  languageSet: 'Idioma definido en español. Las descripciones de los comandos cambian en la próxima sesión.',
  unknownLanguage: name => `Idioma desconocido: ${name}. Usa en, pt o es.`,
}

export const STRINGS = { en, pt, es }
