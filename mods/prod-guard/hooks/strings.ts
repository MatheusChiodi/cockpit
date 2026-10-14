const en = {
  confirm: (what: string) => `prod-guard: ${what}. Confirm before running.`,
  failed: 'prod-guard: the check failed, confirm manually.',
  deploy: 'production deploy',
  firebase: 'firebase deploy',
  terraform: 'terraform apply/destroy',
  kubernetes: 'change to a Kubernetes cluster',
  eas: 'publishing through EAS',
  publish: 'package publish',
  dockerPush: 'docker push',
  release: 'release creation',
  migration: 'database migration',
  prodEnv: 'command with a production environment',
}

type Strings = typeof en

const pt: Strings = {
  confirm: what => `prod-guard: ${what}. Confirme antes de rodar.`,
  failed: 'prod-guard: a verificação falhou, confirme manualmente.',
  deploy: 'deploy em produção',
  firebase: 'firebase deploy',
  terraform: 'terraform apply/destroy',
  kubernetes: 'alteração em cluster Kubernetes',
  eas: 'publicação via EAS',
  publish: 'publicação de pacote',
  dockerPush: 'docker push',
  release: 'criação de release',
  migration: 'migração de banco',
  prodEnv: 'comando com ambiente de produção',
}

const es: Strings = {
  confirm: what => `prod-guard: ${what}. Confirma antes de ejecutar.`,
  failed: 'prod-guard: la verificación falló, confirma manualmente.',
  deploy: 'deploy a producción',
  firebase: 'firebase deploy',
  terraform: 'terraform apply/destroy',
  kubernetes: 'cambio en un clúster de Kubernetes',
  eas: 'publicación mediante EAS',
  publish: 'publicación de paquete',
  dockerPush: 'docker push',
  release: 'creación de release',
  migration: 'migración de base de datos',
  prodEnv: 'comando con entorno de producción',
}

export type What =
  | 'deploy'
  | 'firebase'
  | 'terraform'
  | 'kubernetes'
  | 'eas'
  | 'publish'
  | 'dockerPush'
  | 'release'
  | 'migration'
  | 'prodEnv'

export const STRINGS = { en, pt, es }
