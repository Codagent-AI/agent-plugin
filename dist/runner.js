import { spawn } from 'node:child_process';
export class SubprocessRunner {
    run(command, args, opts) {
        return new Promise((resolve) => {
            const child = spawn(command, args, {
                cwd: opts?.cwd,
                stdio: ['ignore', 'pipe', 'pipe'],
            });
            const stdout = [];
            const stderr = [];
            child.stdout.on('data', (chunk) => stdout.push(chunk));
            child.stderr.on('data', (chunk) => stderr.push(chunk));
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
export function formatCommand(command, args) {
    return [command, ...args].map(shellQuote).join(' ');
}
function shellQuote(value) {
    if (/^[A-Za-z0-9_./:@=-]+$/.test(value))
        return value;
    return `'${value.replaceAll("'", "'\\''")}'`;
}
