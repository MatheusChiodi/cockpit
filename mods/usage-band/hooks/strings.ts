const en = {
  label: 'context',
  limit: (kind: string): string => ({ five_hour: '5h', seven_day: '7d', spend_limit: 'spend' } as Record<string, string>)[kind] ?? kind,
}

type Strings = typeof en

const pt: Strings = {
  label: 'contexto',
  limit: (kind: string): string => ({ five_hour: '5h', seven_day: '7d', spend_limit: 'gasto' } as Record<string, string>)[kind] ?? kind,
}

const es: Strings = {
  label: 'contexto',
  limit: (kind: string): string => ({ five_hour: '5h', seven_day: '7d', spend_limit: 'gasto' } as Record<string, string>)[kind] ?? kind,
}

export const STRINGS = { en, pt, es }
