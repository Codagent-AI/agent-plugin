import { describe, expect, it } from 'vitest';
import { parseGithubSource } from '../src/source.js';

describe('parseGithubSource', () => {
  it('parses a bare owner/repo string', () => {
    expect(parseGithubSource('Codagent-AI/agent-plugin')).toEqual({
      owner: 'Codagent-AI',
      repo: 'agent-plugin',
      normalized: 'Codagent-AI/agent-plugin',
      pluginName: 'agent-plugin',
    });
  });

  it('accepts schema-allowed characters in owner and repo names', () => {
    expect(parseGithubSource('octo_cat.dev-1/repo_name.v2-beta')).toEqual({
      owner: 'octo_cat.dev-1',
      repo: 'repo_name.v2-beta',
      normalized: 'octo_cat.dev-1/repo_name.v2-beta',
      pluginName: 'repo_name.v2-beta',
    });
  });

  it('strips an https GitHub web URL prefix', () => {
    const result = parseGithubSource('https://github.com/Codagent-AI/agent-plugin');

    expect(result.normalized).toBe('Codagent-AI/agent-plugin');
    expect(result.pluginName).toBe('agent-plugin');
  });

  it('rejects non-https GitHub URLs', () => {
    expect(() => parseGithubSource('http://github.com/Codagent-AI/agent-plugin')).toThrow();
  });

  it('strips a trailing .git suffix', () => {
    const result = parseGithubSource('Codagent-AI/agent-plugin.git');

    expect(result.repo).toBe('agent-plugin');
    expect(result.normalized).toBe('Codagent-AI/agent-plugin');
  });

  it('parses a full clone URL with prefix and suffix', () => {
    expect(parseGithubSource('https://github.com/Codagent-AI/agent-plugin.git')).toEqual({
      owner: 'Codagent-AI',
      repo: 'agent-plugin',
      normalized: 'Codagent-AI/agent-plugin',
      pluginName: 'agent-plugin',
    });
  });

  it('trims whitespace around bare form input', () => {
    expect(parseGithubSource('   Codagent-AI/agent-plugin   ').normalized).toBe('Codagent-AI/agent-plugin');
  });

  it('rejects an empty string', () => {
    expect(() => parseGithubSource('')).toThrow();
  });

  it('rejects input without an owner/repo slash', () => {
    expect(() => parseGithubSource('agent-plugin')).toThrow();
  });

  it('rejects input with extra path segments', () => {
    expect(() => parseGithubSource('https://github.com/Codagent-AI/agent-plugin/tree/main')).toThrow();
  });

  it('rejects input with disallowed characters', () => {
    expect(() => parseGithubSource('Codagent AI/agent plugin')).toThrow();
  });
});
