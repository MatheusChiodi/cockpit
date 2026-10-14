const en = {
  switched: (files: number) => `New subject with ${files} files in flight. Park it, or commit first?`,
}

type Strings = typeof en

const pt: Strings = {
  switched: files => `Assunto novo com ${files} arquivos em andamento. Deixar para depois ou commitar antes?`,
}

const es: Strings = {
  switched: files => `Tema nuevo con ${files} archivos en curso. ¿Dejarlo para después o hacer commit antes?`,
}

export const STRINGS = { en, pt, es }
