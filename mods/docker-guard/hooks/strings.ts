const en = {
  ask: (what: string) => `docker-guard: ${what}. Confirm before running.`,
  failed: 'docker-guard: the check failed, confirm manually.',
  prune: 'removes unused Docker data (system prune)',
  volume: 'removes Docker volumes and their data',
  rm: 'force-removes containers (rm -f)',
  rmi: 'force-removes images (rmi -f)',
  down: 'tears down a compose project and deletes its volumes (down -v)',
}

type Strings = typeof en

const pt: Strings = {
  ask: what => `docker-guard: ${what}. Confirme antes de rodar.`,
  failed: 'docker-guard: a verificação falhou, confirme manualmente.',
  prune: 'remove dados Docker não usados (system prune)',
  volume: 'remove volumes Docker e os dados deles',
  rm: 'remove containers à força (rm -f)',
  rmi: 'remove imagens à força (rmi -f)',
  down: 'derruba um projeto compose e apaga os volumes (down -v)',
}

const es: Strings = {
  ask: what => `docker-guard: ${what}. Confirma antes de ejecutar.`,
  failed: 'docker-guard: la verificación falló, confirma manualmente.',
  prune: 'elimina datos de Docker sin uso (system prune)',
  volume: 'elimina volúmenes de Docker y sus datos',
  rm: 'elimina contenedores a la fuerza (rm -f)',
  rmi: 'elimina imágenes a la fuerza (rmi -f)',
  down: 'baja un proyecto compose y borra sus volúmenes (down -v)',
}

export type Reason = 'prune' | 'volume' | 'rm' | 'rmi' | 'down'

export const STRINGS = { en, pt, es }
