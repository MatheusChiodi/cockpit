# Stacks — 7 mods

[← Back to the README](../../README.md)

[`pm-guard`](#pm-guard) · [`script-guard`](#script-guard) · [`missing-import-guard`](#missing-import-guard) · [`client-env-guard`](#client-env-guard) · [`next-boundary-guard`](#next-boundary-guard) · [`esm-guard`](#esm-guard) · [`alias-import-guard`](#alias-import-guard)

## `pm-guard`

Refuses npm, pnpm, yarn or bun commands that use a different package manager than the project's lockfile, and names the right one.

```
/plugin install pm-guard@cockpit
```

![pm-guard](../previews/pm-guard.svg)

## `script-guard`

Refuses npm run or pnpm run of a script that package.json does not declare and lists the ones it does.

```
/plugin install script-guard@cockpit
```

![script-guard](../previews/script-guard.svg)

## `missing-import-guard`

Refuses an edit that imports a package which is neither in package.json nor in node_modules.

```
/plugin install missing-import-guard@cockpit
```

![missing-import-guard](../previews/missing-import-guard.svg)

## `client-env-guard`

Refuses browser code in Vite and Next.js that reads an env variable the bundler never exposes.

```
/plugin install client-env-guard@cockpit
```

![client-env-guard](../previews/client-env-guard.svg)

## `next-boundary-guard`

Refuses Next.js app router edits that break the client/server boundary: hooks without 'use client', or server-only code inside a client file.

```
/plugin install next-boundary-guard@cockpit
```

![next-boundary-guard](../previews/next-boundary-guard.svg)

## `esm-guard`

Refuses require, module.exports and __dirname in .js files of a package that declares "type": "module".

```
/plugin install esm-guard@cockpit
```

![esm-guard](../previews/esm-guard.svg)

## `alias-import-guard`

Refuses deep ../../ imports when tsconfig paths has an alias for the folder, and names the alias to use.

```
/plugin install alias-import-guard@cockpit
```

![alias-import-guard](../previews/alias-import-guard.svg)
