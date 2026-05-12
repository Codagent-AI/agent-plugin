export type Scope = 'user' | 'project';
export type Action = 'install' | 'update' | 'list';
export type Method = 'native' | 'skills';
export type Status = 'success' | 'failed' | 'planned';

export interface CommandRunner {
  run(command: string, args: string[], opts?: { cwd?: string }): Promise<RunResult>;
}

export interface RunResult {
  code: number;
  stdout: string;
  stderr: string;
}

export interface InstallOptions {
  source: string;
  agents: string[];
  scope: Scope;
  yes: boolean;
  dryRun: boolean;
}

export interface UpdateOptions {
  plugin?: string;
  agents: string[];
  scope: Scope;
  yes: boolean;
  dryRun: boolean;
}

export interface AgentResult {
  agent: string;
  action: Action;
  method: Method;
  status: Status;
  scope: Scope;
  commands: string[];
  message?: string;
  error?: string;
  entries?: ListEntry[];
}

export interface ListEntry {
  name: string;
  scope?: string;
  path?: string;
}

export interface AggregateResult {
  ok: boolean;
  results: AgentResult[];
}
