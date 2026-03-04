import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { handleAgentEnd } from "../../src/hooks/agentEnd.js";
import { handleToolResultPersist } from "../../src/hooks/toolResultPersist.js";
import { readErrors } from "../../src/storage/errorReader.js";

const cleanupPaths: string[] = [];

async function makeTempWorkspace(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "forcefield-hook-test-"));
  cleanupPaths.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(
    cleanupPaths.splice(0).map((path) => rm(path, { recursive: true, force: true })),
  );
});

describe("hooks", () => {
  it("records a tool failure from tool_result_persist", async () => {
    const cwd = await makeTempWorkspace();

    const result = await handleToolResultPersist(
      {
        sessionKey: "session-1",
        toolName: "bash",
        params: { cmd: "false" },
        success: false,
        error: "Command exited with status 1",
      },
      {
        cwd,
        now: () => new Date("2026-03-04T12:00:00.000Z"),
      },
    );

    expect(result.recorded).toBe(true);

    const entries = await readErrors({ cwd });
    expect(entries).toHaveLength(1);
    expect(entries[0].source).toBe("tool_failure");
    expect(entries[0].summary).toContain("Tool call failed: bash");
  });

  it("does not record successful tool_result_persist payload", async () => {
    const cwd = await makeTempWorkspace();

    const result = await handleToolResultPersist(
      {
        sessionKey: "session-1",
        toolName: "bash",
        params: { cmd: "echo ok" },
        success: true,
        result: { status: "ok" },
      },
      { cwd },
    );

    expect(result).toEqual({ recorded: false, reason: "not_failure" });
    expect(await readErrors({ cwd })).toHaveLength(0);
  });

  it("records user correction keyword from agent_end (Chinese and English)", async () => {
    const cwd = await makeTempWorkspace();

    const cn = await handleAgentEnd(
      {
        sessionKey: "session-2",
        messages: [
          { role: "assistant", content: "2+2=5" },
          { role: "user", content: "不对，应该是 4" },
        ],
      },
      {
        cwd,
        now: () => new Date("2026-03-04T12:10:00.000Z"),
      },
    );

    const en = await handleAgentEnd(
      {
        sessionKey: "session-2",
        messages: [
          { role: "assistant", content: "Paris is in Germany." },
          { role: "user", content: "No, Paris is in France." },
        ],
      },
      {
        cwd,
        now: () => new Date("2026-03-04T12:11:00.000Z"),
      },
    );

    expect(cn.recorded).toBe(true);
    expect(en.recorded).toBe(true);

    const entries = await readErrors({ cwd });
    expect(entries).toHaveLength(2);
    expect(entries.some((entry) => entry.metadata.triggerKeyword === "不对")).toBe(true);
    expect(entries.some((entry) => entry.metadata.triggerKeyword === "No")).toBe(true);
  });
});
