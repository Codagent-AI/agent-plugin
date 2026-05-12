import type { AggregateResult, AgentResult } from './types.js';

export function printAggregate(result: AggregateResult, json: boolean): void {
  if (json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  for (const item of result.results) {
    const marker = item.status === 'failed' ? 'x' : item.status === 'planned' ? '-' : '✓';
    console.log(`${marker} ${item.agent}: ${item.message ?? item.status}`);
    for (const command of item.commands) {
      console.log(`  ${command}`);
    }
    if (item.entries) {
      for (const entry of item.entries) {
        const scope = entry.scope ? ` (${entry.scope})` : '';
        const location = entry.path ? ` - ${entry.path}` : '';
        console.log(`  ${entry.name}${scope}${location}`);
      }
    }
    if (item.error) console.error(`  ${item.error}`);
  }
}

export function summarizeOk(results: AgentResult[]): AggregateResult {
  return {
    ok: results.every((result) => result.status !== 'failed'),
    results,
  };
}
