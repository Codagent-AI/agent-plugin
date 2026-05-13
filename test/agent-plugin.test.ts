import { createRequire } from 'node:module';
import { describe, expect, it, vi } from 'vitest';
import { installForAgent, updateForAgent } from '../src/adapters.js';
import { normalizeAgent, resolveTargetAgents } from '../src/agents.js';
import { runCli } from '../src/cli.js';
import type { CommandRunner, RunResult } from '../src/types.js';

const require = createRequire(import.meta.url);
const packageJson = require('../package.json') as { version: string };

class MockRunner implements CommandRunner {
  calls: Array<{ command: string; args: string[] }> = [];
  responses = new Map<string, RunResult>();

  set(command: string, args: string[], result: Partial<RunResult>) {
    this.responses.set(key(command, args), {
      code: result.code ?? 0,
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
    });
  }

  async run(command: string, args: string[]): Promise<RunResult> {
    this.calls.push({ command, args });
    return this.responses.get(key(command, args)) ?? { code: 0, stdout: '', stderr: '' };
  }
}

describe('agent-plugin', () => {
  it('prints version once', async () => {
    const runner = new MockRunner();
    const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    const code = await runCli(['--version'], runner);

    const stdoutText = stdout.mock.calls.map((call) => String(call[0])).join('');
    const stderrText = stderr.mock.calls.map((call) => String(call[0])).join('');
    stdout.mockRestore();
    stderr.mockRestore();

    expect(code).toBe(0);
    expect(stdoutText).toBe(`${packageJson.version}\n`);
    expect(stderrText).toBe('');
  });

  it('builds Claude dry-run commands with user scope by default', async () => {
    const runner = new MockRunner();
    const result = await installForAgent({
      agent: normalizeAgent('claude'),
      source: 'Codagent-AI/agent-skills',
      scope: 'user',
      dryRun: true,
      runner,
    });

    expect(result.status).toBe('planned');
    expect(result.commands).toEqual([
      'claude plugin marketplace add Codagent-AI/agent-skills',
      'claude plugin install agent-skills --scope user',
    ]);
  });

  it('uses discovered Claude plugin name when it differs from repo name', async () => {
    const runner = new MockRunner();
    const result = await installForAgent({
      agent: normalizeAgent('claude'),
      source: 'Codagent-AI/agent-skills',
      scope: 'user',
      dryRun: true,
      runner,
      pluginName: 'codagent',
    });

    expect(result.commands).toEqual([
      'claude plugin marketplace add Codagent-AI/agent-skills',
      'claude plugin install codagent --scope user',
    ]);
  });

  it('builds Copilot dry-run command and keeps user scope when project requested', async () => {
    const runner = new MockRunner();
    const result = await installForAgent({
      agent: normalizeAgent('copilot'),
      source: 'Codagent-AI/agent-skills',
      scope: 'project',
      dryRun: true,
      runner,
    });

    expect(result.status).toBe('planned');
    expect(result.scope).toBe('user');
    expect(result.message).toContain('project scope is unsupported');
    expect(result.commands).toEqual(['copilot plugin install Codagent-AI/agent-skills']);
  });

  it('falls Codex through to npx skills at global scope', async () => {
    const runner = new MockRunner();
    const result = await installForAgent({
      agent: normalizeAgent('codex'),
      source: 'Codagent-AI/agent-skills',
      scope: 'project',
      dryRun: true,
      runner,
      skillCount: 7,
    });

    expect(result.method).toBe('skills');
    expect(result.scope).toBe('user');
    expect(result.message).toContain('7 skills copied to');
    expect(result.message).toContain('.agents/skills');
    expect(result.commands).toEqual([
      "npx --yes skills add Codagent-AI/agent-skills --global --yes --skill '*' --agent codex",
    ]);
  });

  it('continues after partial failure and returns non-zero aggregate', async () => {
    const runner = new MockRunner();
    runner.set('claude', ['plugin', 'marketplace', 'add', 'Codagent-AI/agent-skills'], {
      code: 1,
      stderr: 'claude failed',
    });
    const output = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const code = await runCli(
      ['add', 'Codagent-AI/agent-skills', '--agent', 'claude', 'codex', '--json'],
      runner,
    );

    expect(code).toBe(1);
    const logged = output.mock.calls.at(-1)?.[0] as string;
    output.mockRestore();
    error.mockRestore();
    const parsed = JSON.parse(logged) as {
      ok: boolean;
      results: Array<{ agent: string; status: string }>;
    };
    expect(parsed.ok).toBe(false);
    expect(parsed.results).toHaveLength(2);
    expect(parsed.results.map((result) => result.agent)).toEqual(['claude', 'codex']);
  });

  it('defaults to all detected agents with --yes when --agent is omitted', async () => {
    const runner = new MockRunner();
    runner.set('claude', ['--version'], { code: 0 });
    runner.set('copilot', ['--help'], { code: 0 });
    runner.set('codex', ['--version'], { code: 1 });

    const agents = await resolveTargetAgents({ requested: [], yes: true, runner });

    expect(agents.map((agent) => agent.name)).toContain('claude');
    expect(agents.map((agent) => agent.name)).toContain('copilot');
  });

  it('builds update fallback command with a specific skill name', async () => {
    const runner = new MockRunner();
    const result = await updateForAgent({
      agent: normalizeAgent('codex'),
      plugin: 'validator-setup',
      scope: 'project',
      dryRun: true,
      runner,
    });

    expect(result.scope).toBe('user');
    expect(result.commands).toEqual([
      'npx --yes skills update validator-setup --global --yes',
    ]);
  });
});

function key(command: string, args: string[]): string {
  return `${command} ${args.join('\0')}`;
}
