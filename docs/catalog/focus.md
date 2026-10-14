# Focus and notifications — 23 mods

[← Back to the README](../../README.md)

[`turn-notify`](#turn-notify) · [`break-reminder`](#break-reminder) · [`daily-streak`](#daily-streak) · [`error-notify`](#error-notify) · [`needs-you-notify`](#needs-you-notify) · [`agent-done-notify`](#agent-done-notify) · [`long-cmd-notify`](#long-cmd-notify) · [`tests-notify`](#tests-notify) · [`ci-notify`](#ci-notify) · [`pr-review-notify`](#pr-review-notify) · [`rate-limit-notify`](#rate-limit-notify) · [`hydrate`](#hydrate) · [`posture`](#posture) · [`eye-rest`](#eye-rest) · [`stand-up`](#stand-up) · [`alarms`](#alarms) · [`remind`](#remind) · [`timebox`](#timebox) · [`session-cap`](#session-cap) · [`late-night`](#late-night) · [`intent-check`](#intent-check) · [`daily-target`](#daily-target) · [`weekly-recap`](#weekly-recap)

## `turn-notify`

Native notification when a turn of 30s or more finishes.

```
/plugin install turn-notify@cockpit
```

![turn-notify](../previews/turn-notify.svg)

## `break-reminder`

A toast every 50 minutes of session reminding you to take a break.

```
/plugin install break-reminder@cockpit
```

![break-reminder](../previews/break-reminder.svg)

## `daily-streak`

Counts your streak of days using Claude Code; a toast on start and the /streak command.

```
/plugin install daily-streak@cockpit
```

![daily-streak](../previews/daily-streak.svg)

## `error-notify`

Sends a native notification when a turn ends on an error or a refusal.

```
/plugin install error-notify@cockpit
```

![error-notify](../previews/error-notify.svg)

## `needs-you-notify`

Sends a native notification when Claude stops to ask you a question or needs your permission.

```
/plugin install needs-you-notify@cockpit
```

![needs-you-notify](../previews/needs-you-notify.svg)

## `agent-done-notify`

Sends a native notification when a subagent that ran for 30 seconds or more finishes.

```
/plugin install agent-done-notify@cockpit
```

![agent-done-notify](../previews/agent-done-notify.svg)

## `long-cmd-notify`

Sends a native notification when a shell command that ran two minutes or more finishes.

```
/plugin install long-cmd-notify@cockpit
```

![long-cmd-notify](../previews/long-cmd-notify.svg)

## `tests-notify`

Sends a native notification with pass or fail when a test run of 30 seconds or more finishes.

```
/plugin install tests-notify@cockpit
```

![tests-notify](../previews/tests-notify.svg)

## `ci-notify`

Polls GitHub Actions every two minutes and notifies once when a running workflow completes.

```
/plugin install ci-notify@cockpit
```

![ci-notify](../previews/ci-notify.svg)

## `pr-review-notify`

Polls the current branch's pull request every three minutes and notifies once when its review decision changes.

```
/plugin install pr-review-notify@cockpit
```

![pr-review-notify](../previews/pr-review-notify.svg)

## `rate-limit-notify`

Sends a native notification the first time a rate limit window passes 90%, with when it resets.

```
/plugin install rate-limit-notify@cockpit
```

![rate-limit-notify](../previews/rate-limit-notify.svg)

## `hydrate`

Toast every 60 minutes of real use reminding you to drink water.

```
/plugin install hydrate@cockpit
```

![hydrate](../previews/hydrate.svg)

## `posture`

Toast every 30 minutes of use with one short posture check, rotating through four.

```
/plugin install posture@cockpit
```

![posture](../previews/posture.svg)

## `eye-rest`

The 20-20-20 rule: every 20 minutes of use, look 20 feet away for 20 seconds.

```
/plugin install eye-rest@cockpit
```

![eye-rest](../previews/eye-rest.svg)

## `stand-up`

Toast after two hours of use without a 10 minute break: stand up and walk.

```
/plugin install stand-up@cockpit
```

![stand-up](../previews/stand-up.svg)

## `alarms`

/alarm sets daily alarms at a local time, kept across sessions, with a toast and a notification.

```
/plugin install alarms@cockpit
```

![alarms](../previews/alarms.svg)

## `remind`

/remind <minutes> <text> fires a toast and a notification after that many minutes.

```
/plugin install remind@cockpit
```

![remind](../previews/remind.svg)

## `timebox`

/timebox <minutes> <what> counts down on the status line, warns at 80% and notifies at the end.

```
/plugin install timebox@cockpit
```

![timebox](../previews/timebox.svg)

## `session-cap`

Toast after three hours of continuous use in one session, then again every hour.

```
/plugin install session-cap@cockpit
```

![session-cap](../previews/session-cap.svg)

## `late-night`

One toast per session when you work after 23:00 local time: it is late, park the work.

```
/plugin install late-night@cockpit
```

![late-night](../previews/late-night.svg)

## `intent-check`

/intent says what the session is for; every 30 minutes of use a toast asks if you are still on it.

```
/plugin install intent-check@cockpit
```

![intent-check](../previews/intent-check.svg)

## `daily-target`

/target sets a daily commit goal for this repository; toasts at half and at the goal.

```
/plugin install daily-target@cockpit
```

![daily-target](../previews/daily-target.svg)

## `weekly-recap`

On the first session of a new week, one toast with last week's days active, sessions and prompts.

```
/plugin install weekly-recap@cockpit
```

![weekly-recap](../previews/weekly-recap.svg)
