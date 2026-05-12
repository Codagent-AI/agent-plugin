import os from 'node:os';
import path from 'node:path';
import { existsSync, statSync } from 'node:fs';
import { checkbox } from '@inquirer/prompts';
import type { CommandRunner } from './types.js';

export type NativeAgent = 'claude' | 'copilot';

export interface NormalizedAgent {
  input: string;
  name: string;
  skillsName: string;
  native?: NativeAgent;
}

const ALIASES: Record<string, NormalizedAgent> = {
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

export function normalizeAgent(input: string): NormalizedAgent {
  const key = input.trim().toLowerCase();
  return ALIASES[key] ?? { input, name: key, skillsName: key };
}

export function uniqueAgents(inputs: string[]): NormalizedAgent[] {
  const seen = new Set<string>();
  const result: NormalizedAgent[] = [];
  for (const input of inputs) {
    const agent = normalizeAgent(input);
    if (seen.has(agent.name)) continue;
    seen.add(agent.name);
    result.push(agent);
  }
  return result;
}

export async function resolveTargetAgents(opts: {
  requested: string[];
  yes: boolean;
  runner: CommandRunner;
}): Promise<NormalizedAgent[]> {
  if (opts.requested.length > 0) return uniqueAgents(opts.requested);

  const detected = await detectInstalledAgents(opts.runner);
  if (detected.length === 0) {
    throw new Error('No supported agents detected. Pass --agent to choose a target.');
  }
  if (detected.length === 1 || opts.yes) return detected;

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

export async function detectInstalledAgents(runner: CommandRunner): Promise<NormalizedAgent[]> {
  const detected: string[] = [];
  if ((await runner.run('claude', ['--version'])).code === 0) detected.push('claude');
  if ((await runner.run('copilot', ['--help'])).code === 0) detected.push('copilot');
  if ((await runner.run('codex', ['--version'])).code === 0 || dirExists(codexHome())) {
    detected.push('codex');
  }
  if (dirExists(path.join(os.homedir(), '.cursor'))) detected.push('cursor');
  if (dirExists(path.join(configHome(), 'opencode'))) detected.push('opencode');
  return uniqueAgents(detected);
}

export function fallbackSkillsDir(skillsName: string): { dir: string; exact: boolean } {
  void skillsName;
  return { dir: path.join(os.homedir(), '.agents', 'skills'), exact: true };
}

function codexHome(): string {
  return process.env.CODEX_HOME || path.join(os.homedir(), '.codex');
}

function configHome(): string {
  return process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
}

function dirExists(dir: string): boolean {
  try {
    return statSyncNoThrow(dir);
  } catch {
    return false;
  }
}

function statSyncNoThrow(dir: string): boolean {
  return existsSync(dir) && statSync(dir).isDirectory();
}
