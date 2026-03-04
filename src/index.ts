import { z } from "zod";

import { runForcefieldCli } from "./cli.js";
import { handleAgentEnd } from "./hooks/agentEnd.js";
import { handleToolResultPersist } from "./hooks/toolResultPersist.js";

interface LoggerLike {
  info?: (message: string) => void;
  warn?: (message: string) => void;
  error?: (message: string) => void;
}

interface OpenClawApiLike {
  workspacePath?: string;
  logger?: LoggerLike;
  registerHook?: (eventName: string, handler: (event: unknown) => void | Promise<void>) => void;
  registerCommand?: ((name: string, handler: (args: string[]) => unknown) => void) | ((def: { name: string; description?: string; run: (args: string[]) => unknown }) => void);
  registerCliCommand?: (def: { name: string; description?: string; run: (args: string[]) => unknown }) => void;
}

const EmptyConfigSchema = z.object({}).passthrough();

function resolveCwd(api: OpenClawApiLike): string {
  if (api.workspacePath && api.workspacePath.trim()) {
    return api.workspacePath;
  }

  return process.cwd();
}

async function executeCli(args: string[], cwd: string): Promise<string> {
  const result = await runForcefieldCli(["forcefield", ...args], { cwd });
  return result.output;
}

function registerCli(api: OpenClawApiLike, cwd: string): void {
  const run = async (args: string[]) => executeCli(args ?? [], cwd);

  if (typeof api.registerCliCommand === "function") {
    api.registerCliCommand({
      name: "forcefield",
      description: "Forcefield error collection commands",
      run,
    });
    return;
  }

  if (typeof api.registerCommand === "function") {
    try {
      (api.registerCommand as (name: string, handler: (args: string[]) => unknown) => void)("forcefield", run);
      return;
    } catch {
      (api.registerCommand as (def: { name: string; description?: string; run: (args: string[]) => unknown }) => void)({
        name: "forcefield",
        description: "Forcefield error collection commands",
        run,
      });
    }
  }
}

function registerHooks(api: OpenClawApiLike, cwd: string): void {
  if (typeof api.registerHook !== "function") {
    return;
  }

  api.registerHook("tool_result_persist", async (event) => {
    const result = await handleToolResultPersist(event, { cwd });
    if (result.recorded) {
      api.logger?.info?.(`[forcefield] recorded tool failure ${result.id}`);
    }
  });

  api.registerHook("agent_end", async (event) => {
    const result = await handleAgentEnd(event, { cwd });
    if (result.recorded) {
      api.logger?.info?.(`[forcefield] recorded user correction ${result.id}`);
    }
  });
}

const plugin = {
  id: "forcefield",
  name: "Agent Forcefield",
  description: "Collect tool failures and user corrections into .learnings/ERRORS.md",
  configSchema: EmptyConfigSchema,
  register(api: OpenClawApiLike): void {
    const cwd = resolveCwd(api);
    registerHooks(api, cwd);
    registerCli(api, cwd);
    api.logger?.info?.("[forcefield] plugin registered");
  },
};

export default plugin;
