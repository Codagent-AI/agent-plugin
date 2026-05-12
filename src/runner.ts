import { spawn } from 'node:child_process';
import type { CommandRunner, RunResult } from './types.js';

export class SubprocessRunner implements CommandRunner {
  run(command: string, args: string[], opts?: { cwd?: string }): Promise<RunResult> {
    return new Promise((resolve) => {
      const child = spawn(command, args, {
        cwd: opts?.cwd,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      const stdout: Buffer[] = [];
      const stderr: Buffer[] = [];
      child.stdout.on('data', (chunk: Buffer) => stdout.push(chunk));
      child.stderr.on('data', (chunk: Buffer) => stderr.push(chunk));
      child.on('error', (error) => {
        resolve({ code: 127, stdout: '', stderr: error.message });
      });
      child.on('close', (code) => {
        resolve({
          code: code ?? 1,
          stdout: Buffer.concat(stdout).toString('utf8'),
          stderr: Buffer.concat(stderr).toString('utf8'),
        });
      });
    });
  }
}

export function formatCommand(command: string, args: string[]): string {
  return [command, ...args].map(shellQuote).join(' ');
}

function shellQuote(value: string): string {
  if (/^[A-Za-z0-9_./:@=-]+$/.test(value)) return value;
  return `'${value.replaceAll("'", "'\\''")}'`;
}
