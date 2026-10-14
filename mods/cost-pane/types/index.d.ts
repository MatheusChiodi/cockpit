export type Spend = {
  // Session cost at the last measurement.
  last: number
  // Cost accrued since the last turn ended.
  pending: number
  // Cost of each finished turn, in US dollars.
  turns: number[]
}

declare module 'claude-code' {
  interface PluginState {
    'cost-pane': { spend: Spend }
  }
}
