import os from 'node:os';
import path from 'node:path';
import { existsSync, statSync } from 'node:fs';
import { checkbox } from '@inquirer/prompts';
const ALIASES = {
    claude: { input: 'claude', name: 'claude', skillsName: 'claude-code', native: 'claude' },
    'claude-code': { input: 'claude-code', name: 'claude', skillsName: 'claude-code', native: 'claude' },
    copilot: {
        input: 'copilot',
        name: 'copilot',
        skillsName: 'github-copilot',
        native: 'copilot',
    },
    'github-copilot': {
        input: 'github-copilot',
        name: 'copilot',
        skillsName: 'github-copilot',
        native: 'copilot',
    },
};
export function normalizeAgent(input) {
    const key = input.trim().toLowerCase();
    return ALIASES[key] ?? { input, name: key, skillsName: key };
}
export function uniqueAgents(inputs) {
    const seen = new Set();
    const result = [];
    for (const input of inputs) {
        const agent = normalizeAgent(input);
        if (seen.has(agent.name))
            continue;
        seen.add(agent.name);
        result.push(agent);
    }
    return result;
}
export async function resolveTargetAgents(opts) {
    if (opts.requested.length > 0)
        return uniqueAgents(opts.requested);
    const detected = await detectInstalledAgents(opts.runner);
    if (detected.length === 0) {
        throw new Error('No supported agents detected. Pass --agent to choose a target.');
    }
    if (detected.length === 1 || opts.yes)
        return detected;
    const selected = await checkbox({
        message: 'Which agents do you want to install to?',
        choices: detected.map((agent) => ({
            name: agent.input,
            value: agent.input,
            checked: true,
        })),
        required: true,
    });
    return uniqueAgents(selected);
}
export async function detectInstalledAgents(runner) {
    const detected = [];
    if ((await runner.run('claude', ['--version'])).code === 0)
        detected.push('claude');
    if ((await runner.run('copilot', ['--help'])).code === 0)
        detected.push('copilot');
    if ((await runner.run('codex', ['--version'])).code === 0 || dirExists(codexHome())) {
        detected.push('codex');
    }
    if (dirExists(path.join(os.homedir(), '.cursor')))
        detected.push('cursor');
    if (dirExists(path.join(configHome(), 'opencode')))
        detected.push('opencode');
    return uniqueAgents(detected);
}
export function fallbackSkillsDir(skillsName) {
    if (skillsName === 'codex')
        return { dir: path.join(codexHome(), 'skills'), exact: true };
    if (skillsName === 'cursor')
        return { dir: path.join(os.homedir(), '.cursor', 'skills'), exact: true };
    if (skillsName === 'opencode') {
        return { dir: path.join(configHome(), 'opencode', 'skills'), exact: true };
    }
    return { dir: path.join(os.homedir(), '.agents', 'skills'), exact: false };
}
function codexHome() {
    return process.env.CODEX_HOME || path.join(os.homedir(), '.codex');
}
function configHome() {
    return process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
}
function dirExists(dir) {
    try {
        return statSyncNoThrow(dir);
    }
    catch {
        return false;
    }
}
function statSyncNoThrow(dir) {
    return existsSync(dir) && statSync(dir).isDirectory();
}
