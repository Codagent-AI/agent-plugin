import type { CommandRunner } from './types.js';
export type NativeAgent = 'claude' | 'copilot';
export interface NormalizedAgent {
    input: string;
    name: string;
    skillsName: string;
    native?: NativeAgent;
}
export declare function normalizeAgent(input: string): NormalizedAgent;
export declare function uniqueAgents(inputs: string[]): NormalizedAgent[];
export declare function resolveTargetAgents(opts: {
    requested: string[];
    yes: boolean;
    runner: CommandRunner;
}): Promise<NormalizedAgent[]>;
export declare function detectInstalledAgents(runner: CommandRunner): Promise<NormalizedAgent[]>;
export declare function fallbackSkillsDir(skillsName: string): {
    dir: string;
    exact: boolean;
};
