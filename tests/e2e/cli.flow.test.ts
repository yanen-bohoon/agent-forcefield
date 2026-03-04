import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { runForcefieldCli } from "../../src/cli.js";

const cleanupPaths: string[] = [];

async function makeTempWorkspace(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "forcefield-cli-test-"));
  cleanupPaths.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(
    cleanupPaths.splice(0).map((path) => rm(path, { recursive: true, force: true })),
  );
});

describe("CLI e2e flow", () => {
  it("supports help, add, list, and show", async () => {
    const cwd = await makeTempWorkspace();

    const help = await runForcefieldCli(["forcefield", "--help"], { cwd });
    expect(help.exitCode).toBe(0);
    expect(help.output).toContain("openclaw forcefield error add <description>");

    const add = await runForcefieldCli(["forcefield", "error", "add", "Docker build failed on arm64"], {
      cwd,
      now: () => new Date("2026-03-04T15:00:00.000Z"),
    });
    expect(add.exitCode).toBe(0);
    expect(add.output).toContain("Added error entry ERR-20260304-001");

    const list = await runForcefieldCli(["forcefield", "error", "list"], { cwd });
    expect(list.exitCode).toBe(0);
    expect(list.output).toContain("ERR-20260304-001");
    expect(list.output).toContain("Docker build failed on arm64");

    const show = await runForcefieldCli(["forcefield", "error", "show", "ERR-20260304-001"], { cwd });
    expect(show.exitCode).toBe(0);
    expect(show.output).toContain("ERR-20260304-001");
    expect(show.output).toContain("Summary:");
    expect(show.output).toContain("Docker build failed on arm64");
  });
});
