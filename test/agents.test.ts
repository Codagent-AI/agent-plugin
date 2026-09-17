import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { fallbackSkillsDir, normalizeAgent, uniqueAgents } from '../src/agents.js';

describe('normalizeAgent', () => {
  it('resolves exact alias claude', () => {
    expect(normalizeAgent('claude')).toEqual({
      input: 'claude',
      name: 'claude',
      skillsName: 'claude-code',
      native: 'claude',
    });
  });

  it('resolves claude-code to the same canonical agent', () => {
    expect(normalizeAgent('claude-code')).toEqual({
      input: 'claude-code',
      name: 'claude',
      skillsName: 'claude-code',
      native: 'claude',
    });
  });

  it('resolves mixed-case aliases case-insensitively', () => {
    expect(normalizeAgent('Claude')).toEqual({
      input: 'claude',
      name: 'claude',
      skillsName: 'claude-code',
      native: 'claude',
    });
    expect(normalizeAgent('GITHUB-COPILOT')).toEqual({
      input: 'github-copilot',
      name: 'copilot',
      skillsName: 'github-copilot',
      native: 'copilot',
    });
  });

  it('trims surrounding whitespace before alias lookup', () => {
    expect(normalizeAgent('  copilot  ')).toEqual({
      input: 'copilot',
      name: 'copilot',
      skillsName: 'github-copilot',
      native: 'copilot',
    });
  });

  it('passes through unknown lowercase agents', () => {
    const result = normalizeAgent('codex');

    expect(result).toEqual({ input: 'codex', name: 'codex', skillsName: 'codex' });
    expect(result.native).toBeUndefined();
  });

  it('preserves unknown agent input casing', () => {
    const result = normalizeAgent('Codex');

    expect(result.input).toBe('Codex');
    expect(result.name).toBe('codex');
    expect(result.skillsName).toBe('codex');
  });
});

describe('uniqueAgents', () => {
  it('returns an empty list for empty input', () => {
    expect(uniqueAgents([])).toEqual([]);
  });

  it('preserves distinct agents in first-occurrence order', () => {
    expect(uniqueAgents(['claude', 'copilot', 'codex']).map((agent) => agent.name)).toEqual([
      'claude',
      'copilot',
      'codex',
    ]);
  });

  it('deduplicates aliases that collapse to the same canonical agent', () => {
    expect(uniqueAgents(['claude', 'claude-code'])).toEqual([normalizeAgent('claude')]);
  });

  it('deduplicates exact duplicate entries', () => {
    expect(uniqueAgents(['copilot', 'copilot'])).toHaveLength(1);
  });

  it('preserves ordering across mixed aliases', () => {
    expect(uniqueAgents(['github-copilot', 'claude', 'copilot']).map((agent) => agent.name)).toEqual([
      'copilot',
      'claude',
    ]);
  });
});

describe('fallbackSkillsDir', () => {
  it('returns the home-scoped skills directory', () => {
    expect(fallbackSkillsDir('claude-code')).toEqual({
      dir: path.join(os.homedir(), '.agents', 'skills'),
      exact: true,
    });
  });

  it('ignores the skillsName argument', () => {
    expect([
      fallbackSkillsDir('claude-code'),
      fallbackSkillsDir('github-copilot'),
      fallbackSkillsDir(''),
    ]).toEqual([
      fallbackSkillsDir('claude-code'),
      fallbackSkillsDir('claude-code'),
      fallbackSkillsDir('claude-code'),
    ]);
  });
});
