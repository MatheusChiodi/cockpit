const en = {
  command: 'Find local branches already merged upstream and delete them after asking',
  noGit: 'Not a git repository (or git is not available).',
  none: 'No merged branches to delete.',
  confirm: (count: number, names: string) => `Delete ${count} merged branch(es)? ${names}`,
  yes: 'yes',
  no: 'no',
  cancelled: 'Cancelled.',
  deleted: (count: number) => `Deleted ${count} branch(es).`,
  partial: (count: number, failed: string) => `Deleted ${count} branch(es); could not delete: ${failed}`,
}

type Strings = typeof en

const pt: Strings = {
  command: 'Encontra branches locais já mescladas no remoto e as apaga depois de perguntar',
  noGit: 'Não é um repositório git (ou o git não está disponível).',
  none: 'Nenhuma branch mesclada para apagar.',
  confirm: (count, names) => `Apagar ${count} branch(es) mesclada(s)? ${names}`,
  yes: 'sim',
  no: 'não',
  cancelled: 'Cancelado.',
  deleted: count => `${count} branch(es) apagada(s).`,
  partial: (count, failed) => `${count} branch(es) apagada(s); não foi possível apagar: ${failed}`,
}

const es: Strings = {
  command: 'Encuentra ramas locales ya fusionadas en el remoto y las elimina tras preguntar',
  noGit: 'No es un repositorio git (o git no está disponible).',
  none: 'No hay ramas fusionadas para eliminar.',
  confirm: (count, names) => `¿Eliminar ${count} rama(s) fusionada(s)? ${names}`,
  yes: 'sí',
  no: 'no',
  cancelled: 'Cancelado.',
  deleted: count => `${count} rama(s) eliminada(s).`,
  partial: (count, failed) => `${count} rama(s) eliminada(s); no se pudo eliminar: ${failed}`,
}

export const STRINGS = { en, pt, es }
