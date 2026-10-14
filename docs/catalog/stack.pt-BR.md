# Stacks — 4 mods

[← Voltar ao README](../../README.pt-BR.md)

[`pm-guard`](#pm-guard) · [`script-guard`](#script-guard) · [`missing-import-guard`](#missing-import-guard) · [`client-env-guard`](#client-env-guard)

## `pm-guard`

Recusa comandos npm, pnpm, yarn ou bun de um gerenciador diferente do lockfile do projeto e indica o certo.

```
/plugin install pm-guard@cockpit
```

![pm-guard](../previews/pm-guard.svg)

## `script-guard`

Recusa npm run ou pnpm run de um script que o package.json não declara e lista os que ele declara.

```
/plugin install script-guard@cockpit
```

![script-guard](../previews/script-guard.svg)

## `missing-import-guard`

Recusa uma edição que importa um pacote que não está no package.json nem no node_modules.

```
/plugin install missing-import-guard@cockpit
```

![missing-import-guard](../previews/missing-import-guard.svg)

## `client-env-guard`

Recusa código de navegador em Vite e Next.js que lê uma variável de ambiente que o bundler nunca expõe.

```
/plugin install client-env-guard@cockpit
```

![client-env-guard](../previews/client-env-guard.svg)
