import { readdir } from 'node:fs/promises';
import { fallbackSkillsDir } from './agents.js';
import { formatCommand } from './runner.js';
import { parseGithubSource } from './source.js';
export async function installForAgent(opts) {
    if (opts.agent.native === 'claude')
        return installClaude(opts);
    if (opts.agent.native === 'copilot')
        return installCopilot(opts);
    return installSkillsFallback(opts);
}
export async function updateForAgent(opts) {
    if (opts.agent.native === 'claude')
        return updateClaude(opts);
    if (opts.agent.native === 'copilot')
        return updateCopilot(opts);
    return updateSkillsFallback(opts);
}
export async function listForAgent(opts) {
    if (opts.agent.native === 'claude')
        return listClaude(opts);
    if (opts.agent.native === 'copilot')
        return listCopilot(opts);
    return listSkillsFallback(opts.agent);
}
async function installClaude(opts) {
    const source = parseGithubSource(opts.source);
    const pluginName = opts.pluginName ?? source.pluginName;
    const args1 = ['plugin', 'marketplace', 'add', source.normalized];
    const args2 = ['plugin', 'install', pluginName, '--scope', opts.scope];
    const commands = [formatCommand('claude', args1), formatCommand('claude', args2)];
    if (opts.dryRun) {
        return planned(opts.agent.name, 'install', 'native', opts.scope, commands, `Claude plugin will be installed from ${githubRepoUrl(source.normalized)} via:`);
    }
    const add = await opts.runner.run('claude', args1);
    if (add.code !== 0)
        return failed(opts.agent.name, 'install', 'native', opts.scope, commands, add);
    const install = await opts.runner.run('claude', args2);
    if (install.code !== 0)
        return failed(opts.agent.name, 'install', 'native', opts.scope, commands, install);
    return success(opts.agent.name, 'install', 'native', opts.scope, commands, `Claude plugin installed from ${githubRepoUrl(source.normalized)} via:`);
}
async function updateClaude(opts) {
    const plugin = pluginName(opts.plugin);
    const args1 = ['plugin', 'marketplace', 'update', plugin];
    const plannedArgs2 = ['plugin', 'update', plugin];
    const plannedCommands = [formatCommand('claude', args1), formatCommand('claude', plannedArgs2)];
    if (opts.dryRun)
        return planned(opts.agent.name, 'update', 'native', opts.scope, plannedCommands, 'Claude plugin update');
    const market = await opts.runner.run('claude', args1);
    if (market.code !== 0)
        return failed(opts.agent.name, 'update', 'native', opts.scope, [formatCommand('claude', args1)], market);
    const list = await opts.runner.run('claude', ['plugin', 'list', '--json']);
    const installedPlugin = list.code === 0 ? resolveClaudeInstalledPlugin(list.stdout, plugin) : undefined;
    const args2 = ['plugin', 'update', installedPlugin ?? plugin];
    const commands = [formatCommand('claude', args1), formatCommand('claude', args2)];
    const update = await opts.runner.run('claude', args2);
    if (update.code !== 0)
        return failed(opts.agent.name, 'update', 'native', opts.scope, commands, update);
    return success(opts.agent.name, 'update', 'native', opts.scope, commands, 'Claude plugin updated');
}
async function installCopilot(opts) {
    const source = parseGithubSource(opts.source);
    const args = ['plugin', 'install', source.normalized];
    const commands = [formatCommand('copilot', args)];
    const scope = 'user';
    const scopeNote = opts.scope === 'project' ? 'Copilot project scope is unsupported; using user scope.' : undefined;
    const installMessage = `Copilot plugin ${opts.dryRun ? 'will be installed' : 'installed'} from ${githubRepoUrl(source.normalized)} via:`;
    const message = scopeNote ? `${scopeNote} ${installMessage}` : installMessage;
    if (opts.dryRun)
        return planned(opts.agent.name, 'install', 'native', scope, commands, message);
    const result = await opts.runner.run('copilot', args);
    if (result.code !== 0)
        return failed(opts.agent.name, 'install', 'native', scope, commands, result);
    return success(opts.agent.name, 'install', 'native', scope, commands, message);
}
async function updateCopilot(opts) {
    const plugin = pluginName(opts.plugin);
    const args = ['plugin', 'update', plugin];
    const commands = [formatCommand('copilot', args)];
    const scope = 'user';
    if (opts.dryRun)
        return planned(opts.agent.name, 'update', 'native', scope, commands, 'Copilot plugin update');
    const result = await opts.runner.run('copilot', args);
    if (result.code !== 0)
        return failed(opts.agent.name, 'update', 'native', scope, commands, result);
    return success(opts.agent.name, 'update', 'native', scope, commands, 'Copilot plugin updated');
}
async function installSkillsFallback(opts) {
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
    if (opts.dryRun)
        return planned(opts.agent.name, 'install', 'skills', 'user', commands, plannedDetail);
    const result = await opts.runner.run('npx', args);
    if (result.code !== 0)
        return failed(opts.agent.name, 'install', 'skills', 'user', commands, result);
    return success(opts.agent.name, 'install', 'skills', 'user', commands, successDetail);
}
async function updateSkillsFallback(opts) {
    const args = ['--yes', 'skills', 'update'];
    if (opts.plugin)
        args.push(opts.plugin);
    args.push('--global', '--yes');
    const commands = [formatCommand('npx', args)];
    if (opts.dryRun)
        return planned(opts.agent.name, 'update', 'skills', 'user', commands, 'Global skills update');
    const result = await opts.runner.run('npx', args);
    if (result.code !== 0)
        return failed(opts.agent.name, 'update', 'skills', 'user', commands, result);
    return success(opts.agent.name, 'update', 'skills', 'user', commands, 'Global skills updated');
}
async function listClaude(opts) {
    const args = ['plugin', 'list', '--json'];
    const commands = [formatCommand('claude', args)];
    const result = await opts.runner.run('claude', args);
    if (result.code !== 0)
        return failed(opts.agent.name, 'list', 'native', 'user', commands, result);
    let entries = [];
    try {
        const parsed = JSON.parse(result.stdout);
        const rawEntries = Array.isArray(parsed) ? parsed : (parsed.plugins ?? []);
        entries = rawEntries.map((entry) => {
            const e = entry;
            return { name: e.name ?? e.id ?? 'unknown', scope: e.scope, path: e.path };
        });
    }
    catch {
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
async function listCopilot(opts) {
    const args = ['plugin', 'list'];
    const commands = [formatCommand('copilot', args)];
    const result = await opts.runner.run('copilot', args);
    if (result.code !== 0)
        return failed(opts.agent.name, 'list', 'native', 'user', commands, result);
    const entries = result.stdout
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((name) => ({ name }));
    return { agent: opts.agent.name, action: 'list', method: 'native', status: 'success', scope: 'user', commands, entries };
}
async function listSkillsFallback(agent) {
    const { dir, exact } = fallbackSkillsDir(agent.skillsName);
    let entries = [];
    try {
        const names = await readdir(dir, { withFileTypes: true });
        entries = names.filter((entry) => entry.isDirectory()).map((entry) => ({ name: entry.name, path: `${dir}/${entry.name}` }));
    }
    catch {
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
function pluginName(value) {
    if (!value)
        return 'agent-skills';
    try {
        return parseGithubSource(value).pluginName;
    }
    catch {
        return value;
    }
}
function githubRepoUrl(normalizedSource) {
    return `https://github.com/${normalizedSource}.git`;
}
function resolveClaudeInstalledPlugin(stdout, plugin) {
    try {
        const parsed = JSON.parse(stdout);
        const entries = Array.isArray(parsed) ? parsed : (parsed.plugins ?? []);
        const names = entries.flatMap((entry) => {
            const e = entry;
            return [e.id, e.name].filter((value) => typeof value === 'string' && value.length > 0);
        });
        return names.find((name) => name === plugin) ?? names.find((name) => name.startsWith(`${plugin}@`));
    }
    catch {
        return undefined;
    }
}
function planned(agent, action, method, scope, commands, message) {
    return { agent, action, method, status: 'planned', scope, commands, message };
}
function success(agent, action, method, scope, commands, message) {
    return { agent, action, method, status: 'success', scope, commands, message };
}
function failed(agent, action, method, scope, commands, result) {
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
