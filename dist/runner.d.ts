import type { CommandRunner, RunResult } from './types.js';
export declare class SubprocessRunner implements CommandRunner {
    run(command: string, args: string[], opts?: {
        cwd?: string;
    }): Promise<RunResult>;
}
export declare function formatCommand(command: string, args: string[]): string;
