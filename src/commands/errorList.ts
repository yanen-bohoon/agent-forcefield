import { z } from "zod";

import { getErrorById, readErrors } from "../storage/errorReader.js";
import type { ErrorEntry, ErrorStoreOptions } from "../types/error.js";

const ErrorIdSchema = z.string().regex(/^ERR-\d{8}-[A-Z0-9]{3}$/);

function truncate(text: string, max = 72): string {
  if (text.length <= max) {
    return text;
  }

  return `${text.slice(0, max - 3)}...`;
}

export function formatErrorList(entries: ErrorEntry[]): string {
  if (entries.length === 0) {
    return "No errors logged yet.";
  }

  const rows = entries.map((entry) => {
    const logged = entry.loggedAt.slice(0, 19).replace("T", " ");
    return `${entry.id} | ${logged} | ${entry.priority} | ${truncate(entry.summary)}`;
  });

  return [
    "ID | Logged | Priority | Summary",
    "--- | --- | --- | ---",
    ...rows,
  ].join("\n");
}

function formatErrorDetail(entry: ErrorEntry): string {
  const lines: string[] = [
    `${entry.id} (${entry.title})`,
    `Logged: ${entry.loggedAt}`,
    `Priority: ${entry.priority}`,
    `Status: ${entry.status}`,
    `Area: ${entry.area}`,
    `Source: ${entry.source}`,
    "",
    "Summary:",
    entry.summary,
    "",
    "Error:",
    entry.error ?? "(no explicit error message)",
    "",
    "Context:",
    ...(entry.contextLines.length > 0 ? entry.contextLines.map((line) => `- ${line}`) : ["- (no additional context)"]),
    "",
    "Suggested Fix:",
    entry.suggestedFix ?? "(none)",
    "",
    "Metadata:",
    `- Reproducible: ${entry.metadata.reproducible}`,
    `- Related Files: ${entry.metadata.relatedFiles.length > 0 ? entry.metadata.relatedFiles.join(", ") : "none"}`,
    `- Tags: ${entry.metadata.tags.length > 0 ? entry.metadata.tags.join(", ") : "none"}`,
  ];

  if (entry.metadata.triggerKeyword) {
    lines.push(`- Trigger Keyword: ${entry.metadata.triggerKeyword}`);
  }

  if (entry.metadata.seeAlso.length > 0) {
    lines.push(`- See Also: ${entry.metadata.seeAlso.join(", ")}`);
  }

  return lines.join("\n");
}

export async function errorList(options: ErrorStoreOptions = {}): Promise<string> {
  const entries = await readErrors(options);
  return formatErrorList(entries);
}

export async function errorShow(id: string, options: ErrorStoreOptions = {}): Promise<string> {
  const validatedId = ErrorIdSchema.parse(id);
  const entry = await getErrorById(validatedId, options);

  if (!entry) {
    return `Error entry not found: ${validatedId}`;
  }

  return formatErrorDetail(entry);
}
