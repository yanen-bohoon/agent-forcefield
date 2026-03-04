import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { ErrorEntrySchema, ErrorWriteInputSchema, type ErrorEntry, type ErrorStoreOptions, type ErrorWriteInput } from "../types/error.js";

const LEARNINGS_DIR = ".learnings";
const ERRORS_FILE_NAME = "ERRORS.md";
const ERRORS_HEADER = `# Errors Log

Command failures, exceptions, and unexpected behaviors.

---\n`;

function resolveErrorsPath(cwd: string): { learningsDir: string; errorsFile: string } {
  const learningsDir = join(cwd, LEARNINGS_DIR);
  return {
    learningsDir,
    errorsFile: join(learningsDir, ERRORS_FILE_NAME),
  };
}

async function safeReadText(path: string): Promise<string> {
  try {
    return await readFile(path, "utf8");
  } catch {
    return "";
  }
}

function toUtcDateIdPart(date: Date): string {
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

function stringifyContextValue(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function quoteCodeFence(content: string): string {
  const sanitized = content.replace(/```/g, "``\\`");
  return `\`\`\`\n${sanitized}\n\`\`\``;
}

function nextSequentialId(existing: string, datePart: string): string {
  const regex = /^## \[(ERR-(\d{8})-([A-Z0-9]{3}))\]/gm;
  let max = 0;

  for (let match = regex.exec(existing); match; match = regex.exec(existing)) {
    const matchDate = match[2];
    const sequence = match[3];
    if (matchDate !== datePart || !/^\d{3}$/.test(sequence)) {
      continue;
    }

    const n = Number.parseInt(sequence, 10);
    if (n > max) {
      max = n;
    }
  }

  return `ERR-${datePart}-${String(max + 1).padStart(3, "0")}`;
}

function formatMetadata(entry: ErrorEntry): string[] {
  const lines = [
    `- Reproducible: ${entry.metadata.reproducible}`,
    `- Related Files: ${entry.metadata.relatedFiles.length > 0 ? entry.metadata.relatedFiles.join(", ") : "none"}`,
    `- Source: ${entry.source}`,
  ];

  if (entry.metadata.triggerKeyword) {
    lines.push(`- Trigger Keyword: ${entry.metadata.triggerKeyword}`);
  }

  if (entry.metadata.tags.length > 0) {
    lines.push(`- Tags: ${entry.metadata.tags.join(", ")}`);
  }

  if (entry.metadata.seeAlso.length > 0) {
    lines.push(`- See Also: ${entry.metadata.seeAlso.join(", ")}`);
  }

  return lines;
}

export function formatErrorEntry(entry: ErrorEntry): string {
  const errorBlock = entry.error ? quoteCodeFence(entry.error) : quoteCodeFence("(no explicit error message)");
  const contextLines = entry.contextLines.length > 0 ? entry.contextLines : ["(no additional context)"];

  return [
    `## [${entry.id}] ${entry.title}`,
    "",
    `**Logged**: ${entry.loggedAt}`,
    `**Priority**: ${entry.priority}`,
    `**Status**: ${entry.status}`,
    `**Area**: ${entry.area}`,
    "",
    "### Summary",
    entry.summary,
    "",
    "### Error",
    errorBlock,
    "",
    "### Context",
    ...contextLines.map((line) => `- ${line}`),
    "",
    "### Suggested Fix",
    entry.suggestedFix ?? "Investigate root cause and add/update a preventive rule.",
    "",
    "### Metadata",
    ...formatMetadata(entry),
    "",
    "---",
    "",
  ].join("\n");
}

export async function ensureErrorsFile(options: ErrorStoreOptions = {}): Promise<string> {
  const cwd = options.cwd ?? process.cwd();
  const { learningsDir, errorsFile } = resolveErrorsPath(cwd);

  await mkdir(learningsDir, { recursive: true });
  const existing = await safeReadText(errorsFile);
  if (!existing.trim()) {
    await writeFile(errorsFile, ERRORS_HEADER, "utf8");
  }

  return errorsFile;
}

export async function recordError(input: ErrorWriteInput, options: ErrorStoreOptions = {}): Promise<ErrorEntry> {
  const normalizedInput = ErrorWriteInputSchema.parse(input);
  const now = options.now?.() ?? new Date();
  const loggedAt = now.toISOString();
  const datePart = toUtcDateIdPart(now);

  const errorsFile = await ensureErrorsFile(options);
  const existing = await safeReadText(errorsFile);
  const nextId = nextSequentialId(existing, datePart);

  const entry = ErrorEntrySchema.parse({
    id: nextId,
    loggedAt,
    status: "pending",
    metadata: normalizedInput.metadata ?? {
      reproducible: "unknown",
      relatedFiles: [],
      seeAlso: [],
      tags: [],
    },
    ...normalizedInput,
  });

  const formatted = formatErrorEntry(entry);
  const separator = existing.endsWith("\n") ? "" : "\n";
  await appendFile(errorsFile, `${separator}${formatted}`, "utf8");

  return entry;
}

export function formatContextLine(key: string, value: unknown): string {
  return `${key}: ${stringifyContextValue(value)}`;
}

export function toErrorTitle(raw: string): string {
  const slug = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return slug || "manual_error";
}
