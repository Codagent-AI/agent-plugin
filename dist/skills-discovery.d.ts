import type { CommandRunner } from './types.js';
export interface SourceInspection {
    skillCount: number;
    claudePluginName?: string;
    codexPluginName?: string;
    marketplaceName?: string;
}
export declare function inspectGithubSource(source: string, runner: CommandRunner): Promise<SourceInspection>;
