# Git and GitHub — 4 mods

[← Back to the README](../../README.md)

[`commit-review`](#commit-review) · [`wip-commit-guard`](#wip-commit-guard) · [`marker-guard`](#marker-guard) · [`amend-guard`](#amend-guard)

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

## `marker-guard`

Refuses a commit whose staged changes still hold conflict markers, listing the files.

```
/plugin install marker-guard@cockpit
```

![marker-guard](../previews/marker-guard.svg)

## `amend-guard`

Asks before git commit --amend or git rebase rewrites commits that are already on a remote branch.

```
/plugin install amend-guard@cockpit
```

![amend-guard](../previews/amend-guard.svg)
