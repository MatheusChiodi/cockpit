const en = {
  label: 'written',
  lines: (edits: number) => `lines in ${edits} edit${edits === 1 ? '' : 's'}`,
}

type Strings = typeof en

const pt: Strings = {
  label: 'escrito',
  lines: (edits: number) => `linhas em ${edits} edi${edits === 1 ? 'ção' : 'ções'}`,
}

const es: Strings = {
  label: 'escrito',
  lines: (edits: number) => `líneas en ${edits} edici${edits === 1 ? 'ón' : 'ones'}`,
}

export const STRINGS = { en, pt, es }
