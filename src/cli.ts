import { pathToFileURL } from "node:url";

import { ZodError } from "zod";

import { errorAdd } from "./commands/errorAdd.js";
import { errorList, errorShow } from "./commands/errorList.js";
import type { ErrorStoreOptions } from "./types/error.js";

export interface CliResult {
  exitCode: number;
  output: string;
}

export function forcefieldHelp(): string {
  return [
    "openclaw forcefield",
    "",
    "Usage:",
    "  openclaw forcefield --help",
    "  openclaw forcefield error add <description>",
    "  openclaw forcefield error list",
    "  openclaw forcefield error show <id>",
  ].join("\n");
}

function normalizeArgs(argv: string[]): string[] {
  const args = [...argv];

  if (args[0] === "openclaw") {
    args.shift();
  }

  if (args[0] === "forcefield") {
    args.shift();
  }

  return args;
}

function isHelpRequest(args: string[]): boolean {
  if (args.length === 0) {
    return true;
  }

  return args.includes("--help") || args.includes("-h");
}

function asErrorMessage(err: unknown): string {
  if (err instanceof ZodError) {
    return err.issues.map((issue) => issue.message).join("; ");
  }

  if (err instanceof Error) {
    return err.message;
  }

  return String(err);
}

export async function runForcefieldCli(argv: string[], options: ErrorStoreOptions = {}): Promise<CliResult> {
  const args = normalizeArgs(argv);

  if (isHelpRequest(args)) {
    return { exitCode: 0, output: forcefieldHelp() };
  }

  if (args[0] !== "error") {
    return {
      exitCode: 1,
      output: `Unknown command: ${args[0]}\n\n${forcefieldHelp()}`,
    };
  }

  const subCommand = args[1];

  try {
    if (subCommand === "add") {
      const description = args.slice(2).join(" ").trim();
      if (!description) {
        return {
          exitCode: 1,
          output: `Description is required.\n\n${forcefieldHelp()}`,
        };
      }

      const result = await errorAdd(description, options);
      return {
        exitCode: 0,
        output: `${result.message}\nID: ${result.id}`,
      };
    }

    if (subCommand === "list") {
      return {
        exitCode: 0,
        output: await errorList(options),
      };
    }

    if (subCommand === "show") {
      const id = args[2];
      if (!id) {
        return {
          exitCode: 1,
          output: `Error ID is required.\n\n${forcefieldHelp()}`,
        };
      }

      return {
        exitCode: 0,
        output: await errorShow(id, options),
      };
    }

    return {
      exitCode: 1,
      output: `Unknown error subcommand: ${subCommand ?? "(missing)"}\n\n${forcefieldHelp()}`,
    };
  } catch (error) {
    return {
      exitCode: 1,
      output: `Command failed: ${asErrorMessage(error)}`,
    };
  }
}

export async function main(argv = process.argv.slice(2), options: ErrorStoreOptions = {}): Promise<number> {
  const result = await runForcefieldCli(argv, options);
  const stream = result.exitCode === 0 ? process.stdout : process.stderr;
  stream.write(`${result.output}\n`);
  return result.exitCode;
}

function isDirectExecution(): boolean {
  const executedPath = process.argv[1];
  if (!executedPath) {
    return false;
  }

  return import.meta.url === pathToFileURL(executedPath).href;
}

if (isDirectExecution()) {
  void main().then(
    (exitCode) => {
      process.exitCode = exitCode;
    },
    (error) => {
      process.stderr.write(`Fatal CLI error: ${asErrorMessage(error)}\n`);
      process.exitCode = 1;
    },
  );
}
