# Stacks — 3 mods

[← Back to the README](../../README.md)

[`pm-guard`](#pm-guard) · [`script-guard`](#script-guard) · [`missing-import-guard`](#missing-import-guard)

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
