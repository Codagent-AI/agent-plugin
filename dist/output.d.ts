import type { AggregateResult, AgentResult } from './types.js';
export declare function printAggregate(result: AggregateResult, json: boolean): void;
export declare function summarizeOk(results: AgentResult[]): AggregateResult;
