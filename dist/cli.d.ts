import type { CommandRunner } from './types.js';
export declare function runCli(argv: string[], runner?: CommandRunner): Promise<number>;
