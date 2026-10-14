const en = {
  command: 'Show npm outdated as an aligned table and count the major version jumps',
  head: ['package', 'current', 'wanted', 'latest'],
  upToDate: 'Every dependency is up to date.',
  failed: (reason: string) => `npm outdated failed: ${reason}`,
  noNpm: 'npm not found.',
  summary: (count: number, majors: number) => `${count} outdated, ${majors} major ${majors === 1 ? 'jump' : 'jumps'}`,
}

type Strings = typeof en

const pt: Strings = {
  command: 'Mostra o npm outdated como tabela alinhada e conta os saltos de versão maior',
  head: ['pacote', 'atual', 'desejada', 'última'],
  upToDate: 'Todas as dependências estão atualizadas.',
  failed: reason => `npm outdated falhou: ${reason}`,
  noNpm: 'npm não encontrado.',
  summary: (count, majors) => `${count} desatualizados, ${majors} ${majors === 1 ? 'salto maior' : 'saltos maiores'}`,
}

const es: Strings = {
  command: 'Muestra npm outdated como tabla alineada y cuenta los saltos de versión mayor',
  head: ['paquete', 'actual', 'deseada', 'última'],
  upToDate: 'Todas las dependencias están al día.',
  failed: reason => `npm outdated falló: ${reason}`,
  noNpm: 'npm no encontrado.',
  summary: (count, majors) => `${count} desactualizados, ${majors} ${majors === 1 ? 'salto mayor' : 'saltos mayores'}`,
}

export const STRINGS = { en, pt, es }
