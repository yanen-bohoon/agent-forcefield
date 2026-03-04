import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ErrorEntrySchema, type ErrorEntry, type ErrorMetadata, type ErrorStoreOptions } from "../types/error.js";

const ERRORS_PATH = [".learnings", "ERRORS.md"];

function getErrorsFilePath(cwd: string): string {
  return join(cwd, ...ERRORS_PATH);
}

async function safeReadErrorsFile(path: string): Promise<string> {
  try {
    return await readFile(path, "utf8");
  } catch {
    return "";
  }
}

function extractSection(block: string, sectionName: string): string | undefined {
  const escaped = sectionName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`### ${escaped}\\n([\\s\\S]*?)(?=\\n### |\\n---|$)`);
  const match = block.match(re);
  return match?.[1]?.trim();
}

function parseMetadata(section: string | undefined, source: string): ErrorMetadata {
  const metadata: ErrorMetadata = {
    reproducible: "unknown",
    relatedFiles: [],
    seeAlso: [],
    source: source === "tool_failure" || source === "user_correction" || source === "manual" ? source : undefined,
    tags: [],
  };

  if (!section) {
    return metadata;
  }

  const lineRe = /^-\s+([^:]+):\s*(.*)$/gm;
  for (let line = lineRe.exec(section); line; line = lineRe.exec(section)) {
    const key = line[1].trim().toLowerCase();
    const value = line[2].trim();

    if (key === "reproducible" && (value === "yes" || value === "no" || value === "unknown")) {
      metadata.reproducible = value;
      continue;
    }

    if (key === "related files" && value && value !== "none") {
      metadata.relatedFiles = value.split(",").map((part) => part.trim()).filter(Boolean);
      continue;
    }

    if (key === "see also" && value) {
      metadata.seeAlso = value.split(",").map((part) => part.trim()).filter(Boolean);
      continue;
    }

    if (key === "source" && (value === "tool_failure" || value === "user_correction" || value === "manual")) {
      metadata.source = value;
      continue;
    }

    if (key === "trigger keyword" && value) {
      metadata.triggerKeyword = value;
      continue;
    }

    if (key === "tags" && value) {
      metadata.tags = value.split(",").map((part) => part.trim()).filter(Boolean);
    }
  }

  return metadata;
}

function extractErrorText(section: string | undefined): string | undefined {
  if (!section) {
    return undefined;
  }

  const blockMatch = section.match(/^```\n([\s\S]*?)\n```$/);
  if (blockMatch) {
    return blockMatch[1].trim();
  }

  return section.trim();
}

function parseEntries(markdown: string): ErrorEntry[] {
  const headerRe = /^## \[(ERR-\d{8}-[A-Z0-9]{3})\]\s+(.+)$/gm;
  const headers: Array<{ id: string; title: string; start: number; end: number }> = [];

  for (let match = headerRe.exec(markdown); match; match = headerRe.exec(markdown)) {
    headers.push({
      id: match[1],
      title: match[2].trim(),
      start: match.index,
      end: headerRe.lastIndex,
    });
  }

  const entries: ErrorEntry[] = [];

  for (let i = 0; i < headers.length; i += 1) {
    const current = headers[i];
    const next = headers[i + 1];
    const block = markdown.slice(current.start, next ? next.start : undefined);

    const loggedAt = block.match(/\*\*Logged\*\*:\s*(.+)/)?.[1]?.trim() ?? new Date(0).toISOString();
    const priority = block.match(/\*\*Priority\*\*:\s*(.+)/)?.[1]?.trim() ?? "high";
    const status = block.match(/\*\*Status\*\*:\s*(.+)/)?.[1]?.trim() ?? "pending";
    const area = block.match(/\*\*Area\*\*:\s*(.+)/)?.[1]?.trim() ?? "infra";

    const summary = extractSection(block, "Summary") ?? "(missing summary)";
    const error = extractErrorText(extractSection(block, "Error"));

    const contextSection = extractSection(block, "Context");
    const contextLines = contextSection
      ? contextSection
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line.startsWith("- "))
          .map((line) => line.slice(2).trim())
      : [];

    const suggestedFix = extractSection(block, "Suggested Fix");
    const source = block.match(/-\s+Source:\s*(.+)/)?.[1]?.trim() ?? "manual";
    const metadata = parseMetadata(extractSection(block, "Metadata"), source);

    const parsed = ErrorEntrySchema.safeParse({
      id: current.id,
      title: current.title,
      source,
      loggedAt,
      priority,
      status,
      area,
      summary,
      error,
      contextLines,
      suggestedFix,
      metadata,
    });

    if (parsed.success) {
      entries.push(parsed.data);
    }
  }

  return entries;
}

export async function readErrors(options: ErrorStoreOptions = {}): Promise<ErrorEntry[]> {
  const cwd = options.cwd ?? process.cwd();
  const errorsFile = getErrorsFilePath(cwd);
  const markdown = await safeReadErrorsFile(errorsFile);

  return parseEntries(markdown).sort((a, b) => b.loggedAt.localeCompare(a.loggedAt));
}

export async function getErrorById(id: string, options: ErrorStoreOptions = {}): Promise<ErrorEntry | null> {
  const errors = await readErrors(options);
  return errors.find((entry) => entry.id === id) ?? null;
}
