# Context and cost — 2 mods

[← Back to the README](../../README.md)

[`reread-guard`](#reread-guard) · [`grep-limit`](#grep-limit)

## `reread-guard`

Refuses reading again a file Claude already read this session when it has not changed, once, with a reason.

```
/plugin install reread-guard@cockpit
```

![reread-guard](../previews/reread-guard.svg)

## `grep-limit`

Caps a Grep that prints matching lines at 100 lines and tells Claude when the cap cut the answer.

```
/plugin install grep-limit@cockpit
```

![grep-limit](../previews/grep-limit.svg)
