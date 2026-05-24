import { createRequire } from 'node:module';
import { Command, Option } from 'commander';
import { installForAgent, listForAgent, updateForAgent } from './adapters.js';
import { resolveTargetAgents, uniqueAgents } from './agents.js';
import { printAggregate, summarizeOk } from './output.js';
import { SubprocessRunner } from './runner.js';
import { inspectGithubSource } from './skills-discovery.js';
import { parseGithubSource } from './source.js';
const require = createRequire(import.meta.url);
const packageJson = require('../package.json');
export async function runCli(argv, runner = new SubprocessRunner()) {
    const program = new Command();
    let exitCode = 0;
    program
        .name('agent-plugin')
        .description('Install agent plugins through native CLIs with skills fallback')
        .version(packageJson.version)
        .exitOverride();
    const agentOption = new Option('-a, --agent <agents...>', 'target agents');
    const addCommand = async (source, options) => {
        try {
            parseGithubSource(source);
            const agents = await resolveTargetAgents({
                requested: options.agent ?? [],
                yes: options.yes ?? false,
                runner,
            });
            const sourceInspection = needsSourceInspection(options.dryRun ?? false, agents)
                ? await inspectGithubSource(parseGithubSource(source).normalized, runner)
                : undefined;
            const results = [];
            for (const agent of agents) {
                results.push(await installForAgent({
                    agent,
                    source,
                    scope: options.project ? 'project' : 'user',
                    dryRun: options.dryRun ?? false,
                    runner,
                    skillCount: sourceInspection?.skillCount,
                    pluginName: pluginNameForAgent(agent, sourceInspection),
                    marketplaceName: sourceInspection?.marketplaceName,
                }));
            }
            const aggregate = summarizeOk(results);
            printAggregate(aggregate, options.json ?? false);
            exitCode = aggregate.ok ? 0 : 1;
        }
        catch (error) {
            printError(error, options.json ?? false);
            exitCode = 1;
        }
    };
    program
        .command('add')
        .alias('install')
        .argument('<source>', 'GitHub source as owner/repo')
        .addOption(agentOption)
        .option('-p, --project', 'request project-level install where native plugin CLIs support it')
        .option('-y, --yes', 'skip prompts')
        .option('--json', 'emit JSON')
        .option('--dry-run', 'show planned actions without changing anything')
        .action(addCommand);
    program
        .command('update')
        .argument('[plugin]', 'plugin or skill name')
        .addOption(agentOption)
        .option('-p, --project', 'request project-level update where native plugin CLIs support it')
        .option('-y, --yes', 'skip prompts')
        .option('--json', 'emit JSON')
        .option('--dry-run', 'show planned actions without changing anything')
        .action(async (plugin, options) => {
        try {
            const agents = await resolveTargetAgents({
                requested: options.agent ?? [],
                yes: options.yes ?? false,
                runner,
            });
            const results = [];
            for (const agent of agents) {
                results.push(await updateForAgent({
                    agent,
                    plugin,
                    scope: options.project ? 'project' : 'user',
                    dryRun: options.dryRun ?? false,
                    runner,
                }));
            }
            const aggregate = summarizeOk(results);
            printAggregate(aggregate, options.json ?? false);
            exitCode = aggregate.ok ? 0 : 1;
        }
        catch (error) {
            printError(error, options.json ?? false);
            exitCode = 1;
        }
    });
    program
        .command('list')
        .addOption(agentOption)
        .option('-y, --yes', 'skip prompts')
        .option('--json', 'emit JSON')
        .action(async (options) => {
        try {
            const agents = options.agent?.length
                ? uniqueAgents(options.agent)
                : await resolveTargetAgents({ requested: [], yes: true, runner });
            const results = [];
            for (const agent of agents) {
                results.push(await listForAgent({ agent, runner }));
            }
            const aggregate = summarizeOk(results);
            printAggregate(aggregate, options.json ?? false);
            exitCode = aggregate.ok ? 0 : 1;
        }
        catch (error) {
            printError(error, options.json ?? false);
            exitCode = 1;
        }
    });
    try {
        await program.parseAsync(argv, { from: 'user' });
    }
    catch (error) {
        const err = error;
        exitCode = err.exitCode ?? 1;
        if (!err.code?.startsWith('commander.') && err.message)
            console.error(err.message);
    }
    return exitCode;
}
function needsSourceInspection(dryRun, agents) {
    if (!dryRun)
        return true;
    return agents.some((agent) => agent.native === 'claude') || agents.some((agent) => !agent.native);
}
function pluginNameForAgent(agent, sourceInspection) {
    if (agent.native === 'claude')
        return sourceInspection?.claudePluginName;
    return sourceInspection?.codexPluginName;
}
function printError(error, json) {
    const message = error instanceof Error ? error.message : String(error);
    if (json) {
        console.log(JSON.stringify({ ok: false, results: [], error: message }, null, 2));
    }
    else {
        console.error(message);
    }
}
