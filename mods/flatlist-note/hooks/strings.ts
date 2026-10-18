const en = {
  told: (detail: string, path: string) => `flatlist-note: ${detail} in ${path}, Claude was told to use a FlatList`,
}

type Strings = typeof en

const pt: Strings = {
  told: (detail, path) => `flatlist-note: ${detail} em ${path}, o Claude foi avisado para usar um FlatList`,
}

const es: Strings = {
  told: (detail, path) => `flatlist-note: ${detail} en ${path}, se avisó a Claude que use un FlatList`,
}

export const STRINGS = { en, pt, es }
