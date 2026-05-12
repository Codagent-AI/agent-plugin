import { type NormalizedAgent } from './agents.js';
import type { AgentResult, CommandRunner, Scope } from './types.js';
export declare function installForAgent(opts: {
    agent: NormalizedAgent;
    source: string;
    scope: Scope;
    dryRun: boolean;
    runner: CommandRunner;
    skillCount?: number;
    pluginName?: string;
}): Promise<AgentResult>;
export declare function updateForAgent(opts: {
    agent: NormalizedAgent;
    plugin?: string;
    scope: Scope;
    dryRun: boolean;
    runner: CommandRunner;
}): Promise<AgentResult>;
export declare function listForAgent(opts: {
    agent: NormalizedAgent;
    runner: CommandRunner;
}): Promise<AgentResult>;
