import { readdir } from 'node:fs/promises';
import { fallbackSkillsDir, type NormalizedAgent } from './agents.js';
import { formatCommand } from './runner.js';
import { parseGithubSource } from './source.js';
import type { AgentResult, CommandRunner, ListEntry, Scope } from './types.js';

export async function installForAgent(opts: {
  agent: NormalizedAgent;
  source: string;
  scope: Scope;
  dryRun: boolean;
  runner: CommandRunner;
  skillCount?: number;
}): Promise<AgentResult> {
  if (opts.agent.native === 'claude') return installClaude(opts);
  if (opts.agent.native === 'copilot') return installCopilot(opts);
  return installSkillsFallback(opts);
}

export async function updateForAgent(opts: {
  agent: NormalizedAgent;
  plugin?: string;
  scope: Scope;
  dryRun: boolean;
  runner: CommandRunner;
}): Promise<AgentResult> {
  if (opts.agent.native === 'claude') return updateClaude(opts);
  if (opts.agent.native === 'copilot') return updateCopilot(opts);
  return updateSkillsFallback(opts);
}

export async function listForAgent(opts: {
  agent: NormalizedAgent;
  runner: CommandRunner;
}): Promise<AgentResult> {
  if (opts.agent.native === 'claude') return listClaude(opts);
  if (opts.agent.native === 'copilot') return listCopilot(opts);
  return listSkillsFallback(opts.agent);
}

async function installClaude(opts: {
  agent: NormalizedAgent;
  source: string;
  scope: Scope;
  dryRun: boolean;
  runner: CommandRunner;
}): Promise<AgentResult> {
  const source = parseGithubSource(opts.source);
  const args1 = ['plugin', 'marketplace', 'add', source.normalized];
  const args2 = ['plugin', 'install', source.pluginName, '--scope', opts.scope];
  const commands = [formatCommand('claude', args1), formatCommand('claude', args2)];
  if (opts.dryRun) return planned(opts.agent.name, 'install', 'native', opts.scope, commands, 'Claude plugin install');

  const add = await opts.runner.run('claude', args1);
  if (add.code !== 0) return failed(opts.agent.name, 'install', 'native', opts.scope, commands, add);
  const install = await opts.runner.run('claude', args2);
  if (install.code !== 0) return failed(opts.agent.name, 'install', 'native', opts.scope, commands, install);
  return success(opts.agent.name, 'install', 'native', opts.scope, commands, 'Claude plugin installed');
}

async function updateClaude(opts: {
  agent: NormalizedAgent;
  plugin?: string;
  scope: Scope;
  dryRun: boolean;
  runner: CommandRunner;
}): Promise<AgentResult> {
  const plugin = pluginName(opts.plugin);
  const args1 = ['plugin', 'marketplace', 'update', plugin];
  const args2 = ['plugin', 'update', plugin];
  const commands = [formatCommand('claude', args1), formatCommand('claude', args2)];
  if (opts.dryRun) return planned(opts.agent.name, 'update', 'native', opts.scope, commands, 'Claude plugin update');

  const market = await opts.runner.run('claude', args1);
  if (market.code !== 0) return failed(opts.agent.name, 'update', 'native', opts.scope, commands, market);
  const update = await opts.runner.run('claude', args2);
  if (update.code !== 0) return failed(opts.agent.name, 'update', 'native', opts.scope, commands, update);
  return success(opts.agent.name, 'update', 'native', opts.scope, commands, 'Claude plugin updated');
}

async function installCopilot(opts: {
  agent: NormalizedAgent;
  source: string;
  scope: Scope;
  dryRun: boolean;
  runner: CommandRunner;
}): Promise<AgentResult> {
  const source = parseGithubSource(opts.source);
  const args = ['plugin', 'install', source.normalized];
  const commands = [formatCommand('copilot', args)];
  const scope = 'user';
  const scopeNote = opts.scope === 'project' ? 'Copilot project scope is unsupported; using user scope.' : undefined;
  if (opts.dryRun) return planned(opts.agent.name, 'install', 'native', scope, commands, scopeNote ?? 'Copilot plugin install');

  const result = await opts.runner.run('copilot', args);
  if (result.code !== 0) return failed(opts.agent.name, 'install', 'native', scope, commands, result);
  return success(opts.agent.name, 'install', 'native', scope, commands, scopeNote ?? 'Copilot plugin installed');
}

async function updateCopilot(opts: {
  agent: NormalizedAgent;
  plugin?: string;
  scope: Scope;
  dryRun: boolean;
  runner: CommandRunner;
}): Promise<AgentResult> {
  const plugin = pluginName(opts.plugin);
  const args = ['plugin', 'update', plugin];
  const commands = [formatCommand('copilot', args)];
  const scope = 'user';
  if (opts.dryRun) return planned(opts.agent.name, 'update', 'native', scope, commands, 'Copilot plugin update');

  const result = await opts.runner.run('copilot', args);
  if (result.code !== 0) return failed(opts.agent.name, 'update', 'native', scope, commands, result);
  return success(opts.agent.name, 'update', 'native', scope, commands, 'Copilot plugin updated');
}

async function installSkillsFallback(opts: {
  agent: NormalizedAgent;
  source: string;
  dryRun: boolean;
  runner: CommandRunner;
  skillCount?: number;
}): Promise<AgentResult> {
  const args = ['--yes', 'skills', 'add', opts.source, '--global', '--yes', '--skill', '*', '--agent', opts.agent.skillsName];
  const commands = [formatCommand('npx', args)];
  const dirInfo = fallbackSkillsDir(opts.agent.skillsName);
  const count = opts.skillCount ?? 0;
  const detail = dirInfo.exact ? `${count} skills copied to ${dirInfo.dir}` : `${count} skills copied to approximately ${dirInfo.dir}`;
  if (opts.dryRun) return planned(opts.agent.name, 'install', 'skills', 'user', commands, detail);

  const result = await opts.runner.run('npx', args);
  if (result.code !== 0) return failed(opts.agent.name, 'install', 'skills', 'user', commands, result);
  return success(opts.agent.name, 'install', 'skills', 'user', commands, detail);
}

async function updateSkillsFallback(opts: {
  agent: NormalizedAgent;
  plugin?: string;
  dryRun: boolean;
  runner: CommandRunner;
}): Promise<AgentResult> {
  const args = ['--yes', 'skills', 'update'];
  if (opts.plugin) args.push(opts.plugin);
  args.push('--global', '--yes');
  const commands = [formatCommand('npx', args)];
  if (opts.dryRun) return planned(opts.agent.name, 'update', 'skills', 'user', commands, 'Global skills update');

  const result = await opts.runner.run('npx', args);
  if (result.code !== 0) return failed(opts.agent.name, 'update', 'skills', 'user', commands, result);
  return success(opts.agent.name, 'update', 'skills', 'user', commands, 'Global skills updated');
}

async function listClaude(opts: { agent: NormalizedAgent; runner: CommandRunner }): Promise<AgentResult> {
  const args = ['plugin', 'list', '--json'];
  const commands = [formatCommand('claude', args)];
  const result = await opts.runner.run('claude', args);
  if (result.code !== 0) return failed(opts.agent.name, 'list', 'native', 'user', commands, result);
  let entries: ListEntry[] = [];
  try {
    const parsed = JSON.parse(result.stdout) as unknown;
    const rawEntries = Array.isArray(parsed) ? parsed : ((parsed as { plugins?: unknown[] }).plugins ?? []);
    entries = rawEntries.map((entry) => {
      const e = entry as { name?: string; id?: string; scope?: string; path?: string };
      return { name: e.name ?? e.id ?? 'unknown', scope: e.scope, path: e.path };
    });
  } catch {
    return {
      agent: opts.agent.name,
      action: 'list',
      method: 'native',
      status: 'failed',
      scope: 'user',
      commands,
      error: 'Failed to parse claude plugin list --json output',
    };
  }
  return { agent: opts.agent.name, action: 'list', method: 'native', status: 'success', scope: 'user', commands, entries };
}

async function listCopilot(opts: { agent: NormalizedAgent; runner: CommandRunner }): Promise<AgentResult> {
  const args = ['plugin', 'list'];
  const commands = [formatCommand('copilot', args)];
  const result = await opts.runner.run('copilot', args);
  if (result.code !== 0) return failed(opts.agent.name, 'list', 'native', 'user', commands, result);
  const entries = result.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((name) => ({ name }));
  return { agent: opts.agent.name, action: 'list', method: 'native', status: 'success', scope: 'user', commands, entries };
}

async function listSkillsFallback(agent: NormalizedAgent): Promise<AgentResult> {
  const { dir, exact } = fallbackSkillsDir(agent.skillsName);
  let entries: ListEntry[] = [];
  try {
    const names = await readdir(dir, { withFileTypes: true });
    entries = names.filter((entry) => entry.isDirectory()).map((entry) => ({ name: entry.name, path: `${dir}/${entry.name}` }));
  } catch {
    entries = [];
  }
  return {
    agent: agent.name,
    action: 'list',
    method: 'skills',
    status: 'success',
    scope: 'user',
    commands: [],
    entries,
    message: exact ? `Global skills directory: ${dir}` : `Approximate global skills directory: ${dir}`,
  };
}

function pluginName(value: string | undefined): string {
  if (!value) return 'agent-skills';
  try {
    return parseGithubSource(value).pluginName;
  } catch {
    return value;
  }
}

function planned(
  agent: string,
  action: 'install' | 'update',
  method: 'native' | 'skills',
  scope: Scope,
  commands: string[],
  message: string,
): AgentResult {
  return { agent, action, method, status: 'planned', scope, commands, message };
}

function success(
  agent: string,
  action: 'install' | 'update',
  method: 'native' | 'skills',
  scope: Scope,
  commands: string[],
  message: string,
): AgentResult {
  return { agent, action, method, status: 'success', scope, commands, message };
}

function failed(
  agent: string,
  action: 'install' | 'update' | 'list',
  method: 'native' | 'skills',
  scope: Scope,
  commands: string[],
  result: { stdout: string; stderr: string; code: number },
): AgentResult {
  const output = [result.stderr.trim(), result.stdout.trim()].filter(Boolean).join('\n');
  return {
    agent,
    action,
    method,
    status: 'failed',
    scope,
    commands,
    error: output || `Command exited with code ${result.code}`,
  };
}
