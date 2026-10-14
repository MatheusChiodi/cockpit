# Git and GitHub — 2 mods

[← Back to the README](../../README.md)

[`commit-review`](#commit-review) · [`wip-commit-guard`](#wip-commit-guard)

## `commit-review`

Asks you to look at the diff before a big commit goes through, showing the files and lines staged.

```
/plugin install commit-review@cockpit
```

![commit-review](../previews/commit-review.svg)

## `wip-commit-guard`

Refuses commits whose message is wip, fix, asdf, a dot or similar, so the history says what changed.

```
/plugin install wip-commit-guard@cockpit
```

![wip-commit-guard](../previews/wip-commit-guard.svg)
