export interface ParsedSource {
    owner: string;
    repo: string;
    normalized: string;
    pluginName: string;
}
export declare function parseGithubSource(source: string): ParsedSource;
