# Context and cost — 15 mods

[← Back to the README](../../README.md)

[`reread-guard`](#reread-guard) · [`grep-limit`](#grep-limit) · [`read-cap`](#read-cap) · [`git-log-limit`](#git-log-limit) · [`paste-size-toast`](#paste-size-toast) · [`cat-guard`](#cat-guard) · [`explore-nudge`](#explore-nudge) · [`fill-toast`](#fill-toast) · [`cache-cold-toast`](#cache-cold-toast) · [`flood-note`](#flood-note) · [`heavy-calls`](#heavy-calls) · [`tree-flood-guard`](#tree-flood-guard) · [`agent-cap`](#agent-cap) · [`agent-straggler`](#agent-straggler) · [`cost-per-hour`](#cost-per-hour)

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

## `read-cap`

Reads only the first 600 lines of a file over 150 KB and tells Claude how to continue with offset.

```
/plugin install read-cap@cockpit
```

![read-cap](../previews/read-cap.svg)

## `git-log-limit`

Adds -n 30 to a git log that has no limit, so the history does not flood the context.

```
/plugin install git-log-limit@cockpit
```

![git-log-limit](../previews/git-log-limit.svg)

## `paste-size-toast`

A toast when the prompt you send is very large, with its size in lines and tokens, so you can trim a pasted log.

```
/plugin install paste-size-toast@cockpit
```

![paste-size-toast](../previews/paste-size-toast.svg)

## `cat-guard`

Refuses cat, type and Get-Content on a file over 100 KB and points to a slice or Grep.

```
/plugin install cat-guard@cockpit
```

![cat-guard](../previews/cat-guard.svg)

## `explore-nudge`

After 15 reads and searches in one turn, a toast and a note to Claude to hand the rest of the exploring to a subagent.

```
/plugin install explore-nudge@cockpit
```

![explore-nudge](../previews/explore-nudge.svg)

## `fill-toast`

A toast when the context window jumps 10 points or more in one step, naming the last tool that ran.

```
/plugin install fill-toast@cockpit
```

![fill-toast](../previews/fill-toast.svg)

## `cache-cold-toast`

A toast when you send a prompt after the 5 minute prompt-cache window expired on a large context.

```
/plugin install cache-cold-toast@cockpit
```

![cache-cold-toast](../previews/cache-cold-toast.svg)

## `flood-note`

Tells Claude when a search or command returned over 300 lines, so it narrows the next one instead of repeating it.

```
/plugin install flood-note@cockpit
```

![flood-note](../previews/flood-note.svg)

## `heavy-calls`

/heavy lists the five tool results that took the most context this session, with tool, target and size.

```
/plugin install heavy-calls@cockpit
```

![heavy-calls](../previews/heavy-calls.svg)

## `tree-flood-guard`

Refuses an unfiltered find, ls -R or dir /s that would list node_modules, and suggests git ls-files or Glob.

```
/plugin install tree-flood-guard@cockpit
```

![tree-flood-guard](../previews/tree-flood-guard.svg)

## `agent-cap`

/agentcap <n> caps how many subagents run at once and asks before each one past the cap.

```
/plugin install agent-cap@cockpit
```

![agent-cap](../previews/agent-cap.svg)

## `agent-straggler`

A toast when a subagent has been running more than three times as long as the ones that finished.

```
/plugin install agent-straggler@cockpit
```

![agent-straggler](../previews/agent-straggler.svg)

## `cost-per-hour`

Status line with what the session costs per hour at its pace so far.

```
/plugin install cost-per-hour@cockpit
```

![cost-per-hour](../previews/cost-per-hour.svg)
