const en = {
  limit: 'limit',
  resets: 'resets',
  kind: (kind: string): string => ({ five_hour: '5h', seven_day: '7d', spend_limit: 'spend' } as Record<string, string>)[kind] ?? kind,
}

type Strings = typeof en

const pt: Strings = {
  limit: 'limite',
  resets: 'reseta',
  kind: (kind: string): string => ({ five_hour: '5h', seven_day: '7d', spend_limit: 'gasto' } as Record<string, string>)[kind] ?? kind,
}

const es: Strings = {
  limit: 'límite',
  resets: 'se reinicia en',
  kind: (kind: string): string => ({ five_hour: '5h', seven_day: '7d', spend_limit: 'gasto' } as Record<string, string>)[kind] ?? kind,
}

export const STRINGS = { en, pt, es }
