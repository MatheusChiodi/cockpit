# Git and GitHub — 10 mods

[← Back to the README](../../README.md)

[`commit-review`](#commit-review) · [`wip-commit-guard`](#wip-commit-guard) · [`marker-guard`](#marker-guard) · [`amend-guard`](#amend-guard) · [`stage-guard`](#stage-guard) · [`git-stage`](#git-stage) · [`git-fixup`](#git-fixup) · [`git-sync`](#git-sync) · [`behind-toast`](#behind-toast) · [`git-switch`](#git-switch)

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

## `stage-guard`

Refuses git add -A, git add . and git commit -a while a .env, key or certificate is waiting to be staged.

```
/plugin install stage-guard@cockpit
```

![stage-guard](../previews/stage-guard.svg)

## `git-stage`

/stage lists what is staged, unstaged and new; /stage <paths> stages them and -r unstages, asking first.

```
/plugin install git-stage@cockpit
```

![git-stage](../previews/git-stage.svg)

## `git-fixup`

/fixup commits the staged changes as a fixup of HEAD or any commit, ready for rebase --autosquash.

```
/plugin install git-fixup@cockpit
```

![git-fixup](../previews/git-fixup.svg)

## `git-sync`

/sync fetches and shows how far the branch is from its base; /sync rebase or merge brings the base in after asking.

```
/plugin install git-sync@cockpit
```

![git-sync](../previews/git-sync.svg)

## `behind-toast`

Toast when your branch falls 10, 20, 30 commits behind its base, before the conflicts pile up.

```
/plugin install behind-toast@cockpit
```

![behind-toast](../previews/behind-toast.svg)

## `git-switch`

/gsw switches branch carrying your uncommitted work: stashes it, switches, and offers it back when you return.

```
/plugin install git-switch@cockpit
```

![git-switch](../previews/git-switch.svg)
