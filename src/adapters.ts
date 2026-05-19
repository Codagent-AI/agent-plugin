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
  pluginName?: string;
  marketplaceName?: string;
}): Promise<AgentResult> {
  if (opts.agent.native === 'claude') return installClaude(opts);
  if (opts.agent.native === 'copilot') return installCopilot(opts);
  if (await supportsGenericPluginAdd(opts.agent.name, opts.runner)) return installGenericPluginAdd(opts);
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
  pluginName?: string;
}): Promise<AgentResult> {
  const source = parseGithubSource(opts.source);
  const pluginName = opts.pluginName ?? source.pluginName;
  const args1 = ['plugin', 'marketplace', 'add', source.normalized, '--scope', opts.scope];
  const args2 = ['plugin', 'install', pluginName, '--scope', opts.scope];
  const commands = [formatCommand('claude', args1), formatCommand('claude', args2)];
  if (opts.dryRun) {
    return planned(
      opts.agent.name,
      'install',
      'native',
      opts.scope,
      commands,
      `Claude plugin will be installed from ${githubRepoUrl(source.normalized)} via:`,
    );
  }

  const add = await opts.runner.run('claude', args1);
  if (add.code !== 0) return installSkillsFallbackAfterPluginFailure(opts, commands, add);
  const install = await opts.runner.run('claude', args2);
  if (install.code !== 0) return installSkillsFallbackAfterPluginFailure(opts, commands, install);
  return success(
    opts.agent.name,
    'install',
    'native',
    opts.scope,
    commands,
    `Claude plugin installed from ${githubRepoUrl(source.normalized)} via:`,
  );
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
  const plannedArgs2 = ['plugin', 'update', plugin];
  const plannedCommands = [formatCommand('claude', args1), formatCommand('claude', plannedArgs2)];
  if (opts.dryRun) return planned(opts.agent.name, 'update', 'native', opts.scope, plannedCommands, 'Claude plugin update');

  const market = await opts.runner.run('claude', args1);
  if (market.code !== 0) return failed(opts.agent.name, 'update', 'native', opts.scope, [formatCommand('claude', args1)], market);
  const list = await opts.runner.run('claude', ['plugin', 'list', '--json']);
  const installedPlugin = list.code === 0 ? resolveClaudeInstalledPlugin(list.stdout, plugin) : undefined;
  const args2 = ['plugin', 'update', installedPlugin ?? plugin];
  const commands = [formatCommand('claude', args1), formatCommand('claude', args2)];
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
  const installMessage = `Copilot plugin ${opts.dryRun ? 'will be installed' : 'installed'} from ${githubRepoUrl(source.normalized)} via:`;
  const message = scopeNote ? `${scopeNote} ${installMessage}` : installMessage;
  if (opts.dryRun) return planned(opts.agent.name, 'install', 'native', scope, commands, message);

  const result = await opts.runner.run('copilot', args);
  if (result.code !== 0) return installSkillsFallbackAfterPluginFailure(opts, commands, result);
  return success(opts.agent.name, 'install', 'native', scope, commands, message);
}

async function installGenericPluginAdd(opts: {
  agent: NormalizedAgent;
  source: string;
  scope: Scope;
  dryRun: boolean;
  runner: CommandRunner;
  pluginName?: string;
  marketplaceName?: string;
}): Promise<AgentResult> {
  const source = parseGithubSource(opts.source);
  const plugin = opts.pluginName ?? source.pluginName;
  const marketplace = opts.marketplaceName ?? source.pluginName;
  const args1 = ['plugin', 'marketplace', 'add', source.normalized];
  const args2 = ['plugin', 'add', plugin, '--marketplace', marketplace];
  const commands = [formatCommand(opts.agent.name, args1), formatCommand(opts.agent.name, args2)];
  const scope: Scope = 'user';
  const scopeNote = opts.scope === 'project' ? `${displayAgent(opts.agent.name)} project scope is unsupported; using user scope.` : undefined;
  const installMessage = `${displayAgent(opts.agent.name)} plugin ${opts.dryRun ? 'will be installed' : 'installed'} from ${githubRepoUrl(source.normalized)} via:`;
  const message = scopeNote ? `${scopeNote} ${installMessage}` : installMessage;
  if (opts.dryRun) return planned(opts.agent.name, 'install', 'native', scope, commands, message);

  const addMarketplace = await opts.runner.run(opts.agent.name, args1);
  if (addMarketplace.code !== 0) return installSkillsFallbackAfterPluginFailure(opts, commands, addMarketplace);
  const addPlugin = await opts.runner.run(opts.agent.name, args2);
  if (addPlugin.code !== 0) return installSkillsFallbackAfterPluginFailure(opts, commands, addPlugin);
  return success(opts.agent.name, 'install', 'native', scope, commands, message);
}

async function supportsGenericPluginAdd(agentName: string, runner: CommandRunner): Promise<boolean> {
  const result = await runner.run(agentName, ['plugin', 'add', '--help']);
  return result.code === 0;
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
  scope: Scope;
  dryRun: boolean;
  runner: CommandRunner;
  skillCount?: number;
}): Promise<AgentResult> {
  const source = parseGithubSource(opts.source);
  const args = ['--yes', 'skills', 'add', opts.source, '--global', '--yes', '--skill', '*', '--agent', opts.agent.skillsName];
  const commands = [formatCommand('npx', args)];
  const dirInfo = fallbackSkillsDir(opts.agent.skillsName);
  const count = opts.skillCount ?? 0;
  const plannedDetail = dirInfo.exact
    ? `${count} skills will be copied to ${dirInfo.dir} from ${githubRepoUrl(source.normalized)} via:`
    : `${count} skills will be copied to approximately ${dirInfo.dir} from ${githubRepoUrl(source.normalized)} via:`;
  const successDetail = dirInfo.exact
    ? `${count} skills copied to ${dirInfo.dir} from ${githubRepoUrl(source.normalized)} via:`
    : `${count} skills copied to approximately ${dirInfo.dir} from ${githubRepoUrl(source.normalized)} via:`;
  const plannedMessage = skillsFallbackScopeMessage(opts.scope, plannedDetail);
  const successMessage = skillsFallbackScopeMessage(opts.scope, successDetail);
  if (opts.dryRun) return planned(opts.agent.name, 'install', 'skills', 'user', commands, plannedMessage);

  const result = await opts.runner.run('npx', args);
  if (result.code !== 0) return failed(opts.agent.name, 'install', 'skills', 'user', commands, result);
  return success(opts.agent.name, 'install', 'skills', 'user', commands, successMessage);
}

async function installSkillsFallbackAfterPluginFailure(
  opts: {
    agent: NormalizedAgent;
    source: string;
    scope: Scope;
    dryRun: boolean;
    runner: CommandRunner;
    skillCount?: number;
  },
  nativeCommands: string[],
  nativeResult: { stdout: string; stderr: string; code: number },
): Promise<AgentResult> {
  const fallback = await installSkillsFallback(opts);
  const commands = [...nativeCommands, ...fallback.commands];
  const nativeError = resultOutput(nativeResult) || `Command exited with code ${nativeResult.code}`;
  const prefix = `Native plugin install failed; falling back to skills copy.`;
  if (fallback.status === 'failed') {
    return {
      ...fallback,
      commands,
      error: `Native plugin install failed: ${nativeError}\nSkills fallback failed: ${fallback.error ?? fallback.status}`,
    };
  }
  return {
    ...fallback,
    commands,
    message: `${prefix}\n${fallback.message ?? ''}`,
  };
}

function skillsFallbackScopeMessage(requestedScope: Scope, detail: string): string {
  if (requestedScope !== 'project') return detail;
  return `Warning: project scope was requested, but skills fallback installs are always user/global scope.\n${detail}`;
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

function displayAgent(agentName: string): string {
  return agentName.charAt(0).toUpperCase() + agentName.slice(1);
}

function githubRepoUrl(normalizedSource: string): string {
  return `https://github.com/${normalizedSource}.git`;
}

function resolveClaudeInstalledPlugin(stdout: string, plugin: string): string | undefined {
  try {
    const parsed = JSON.parse(stdout) as unknown;
    const entries = Array.isArray(parsed) ? parsed : ((parsed as { plugins?: unknown[] }).plugins ?? []);
    const normalized = entries.map((entry) => entry as { id?: unknown; name?: unknown });
    const ids = normalized
      .map((entry) => entry.id)
      .filter((value): value is string => typeof value === 'string' && value.length > 0);
    const names = normalized
      .map((entry) => entry.name)
      .filter((value): value is string => typeof value === 'string' && value.length > 0);
    return (
      ids.find((id) => id === plugin) ??
      ids.find((id) => id.startsWith(`${plugin}@`)) ??
      names.find((name) => name === plugin) ??
      names.find((name) => name.startsWith(`${plugin}@`))
    );
  } catch {
    return undefined;
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
  const output = resultOutput(result);
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

function resultOutput(result: { stdout: string; stderr: string }): string {
  return [result.stderr.trim(), result.stdout.trim()].filter(Boolean).join('\n');
}
