import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { getErrorById, readErrors } from "../../src/storage/errorReader.js";
import { ensureErrorsFile, recordError } from "../../src/storage/errorWriter.js";

const cleanupPaths: string[] = [];

async function makeTempWorkspace(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "forcefield-test-"));
  cleanupPaths.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(
    cleanupPaths.splice(0).map((path) => rm(path, { recursive: true, force: true })),
  );
});

describe("errorWriter/errorReader", () => {
  it("creates ERRORS.md header and appends entries with sequential IDs", async () => {
    const cwd = await makeTempWorkspace();

    const errorsFile = await ensureErrorsFile({ cwd });
    const initial = await readFile(errorsFile, "utf8");
    expect(initial).toContain("# Errors Log");

    const entry1 = await recordError(
      {
        title: "docker_build",
        source: "tool_failure",
        priority: "high",
        area: "infra",
        summary: "Docker build failed",
        error: "no match for platform",
        contextLines: ["Command: docker build -t app ."],
        suggestedFix: "Use --platform linux/amd64.",
      },
      {
        cwd,
        now: () => new Date("2026-03-04T10:00:00.000Z"),
      },
    );

    const entry2 = await recordError(
      {
        title: "test_failure",
        source: "manual",
        priority: "medium",
        area: "tests",
        summary: "Unit test assertion mismatch",
        error: "expected 2 to equal 3",
        contextLines: ["Command: vitest run"],
      },
      {
        cwd,
        now: () => new Date("2026-03-04T10:01:00.000Z"),
      },
    );

    expect(entry1.id).toBe("ERR-20260304-001");
    expect(entry2.id).toBe("ERR-20260304-002");

    const entries = await readErrors({ cwd });
    expect(entries).toHaveLength(2);
    expect(entries[0].id).toBe("ERR-20260304-002");

    const loaded = await getErrorById("ERR-20260304-001", { cwd });
    expect(loaded?.summary).toContain("Docker build failed");
  });
});
