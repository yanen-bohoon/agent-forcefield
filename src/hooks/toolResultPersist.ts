import { z } from "zod";

import { recordError, formatContextLine, toErrorTitle } from "../storage/errorWriter.js";
import type { ErrorCaptureResult, ErrorStoreOptions } from "../types/error.js";

const ToolResultPersistEventSchema = z
  .object({
    sessionKey: z.string().optional(),
    timestamp: z.string().optional(),
    toolName: z.string().optional(),
    tool: z.string().optional(),
    params: z.unknown().optional(),
    input: z.unknown().optional(),
    result: z.unknown().optional(),
    error: z.unknown().optional(),
    message: z.string().optional(),
    success: z.boolean().optional(),
    status: z.string().optional(),
    exitCode: z.number().int().optional(),
  })
  .passthrough();

type ToolEvent = z.infer<typeof ToolResultPersistEventSchema>;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function normalizeText(value: unknown): string | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (typeof value === "string") {
    return value.trim() || undefined;
  }

  if (value instanceof Error) {
    return value.message || undefined;
  }

  const rec = asRecord(value);
  if (rec) {
    if (typeof rec.message === "string" && rec.message.trim()) {
      return rec.message.trim();
    }
    if (typeof rec.error === "string" && rec.error.trim()) {
      return rec.error.trim();
    }
    if (typeof rec.stderr === "string" && rec.stderr.trim()) {
      return rec.stderr.trim();
    }
    if (typeof rec.output === "string" && rec.output.trim()) {
      return rec.output.trim();
    }
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function isFailureStatus(value: string | undefined): boolean {
  if (!value) {
    return false;
  }

  return ["error", "failed", "failure", "fatal"].includes(value.toLowerCase());
}

function detectToolFailure(event: ToolEvent): boolean {
  if (event.success === false) {
    return true;
  }

  if (typeof event.exitCode === "number" && event.exitCode !== 0) {
    return true;
  }

  if (isFailureStatus(event.status)) {
    return true;
  }

  if (event.error !== undefined && event.error !== null) {
    return true;
  }

  const result = asRecord(event.result);
  if (!result) {
    return false;
  }

  if (result.success === false) {
    return true;
  }

  if (typeof result.exitCode === "number" && result.exitCode !== 0) {
    return true;
  }

  if (typeof result.status === "string" && isFailureStatus(result.status)) {
    return true;
  }

  if (result.error !== undefined && result.error !== null) {
    return true;
  }

  return false;
}

function extractToolName(event: ToolEvent): string {
  if (event.toolName && event.toolName.trim()) {
    return event.toolName.trim();
  }

  if (event.tool && event.tool.trim()) {
    return event.tool.trim();
  }

  const result = asRecord(event.result);
  if (result && typeof result.toolName === "string" && result.toolName.trim()) {
    return result.toolName.trim();
  }

  return "unknown_tool";
}

function extractErrorMessage(event: ToolEvent): string {
  const candidates = [
    event.error,
    event.message,
    asRecord(event.result)?.error,
    asRecord(event.result)?.message,
    asRecord(event.result)?.stderr,
    asRecord(event.result)?.output,
  ];

  for (const candidate of candidates) {
    const text = normalizeText(candidate);
    if (text) {
      return text;
    }
  }

  return "Unknown tool failure";
}

export async function handleToolResultPersist(
  eventPayload: unknown,
  options: ErrorStoreOptions = {},
): Promise<ErrorCaptureResult> {
  const parsed = ToolResultPersistEventSchema.safeParse(eventPayload);
  if (!parsed.success) {
    return { recorded: false, reason: "invalid_payload" };
  }

  const event = parsed.data;
  if (!detectToolFailure(event)) {
    return { recorded: false, reason: "not_failure" };
  }

  const toolName = extractToolName(event);
  const errorMessage = extractErrorMessage(event);
  const params = event.params ?? event.input;

  const entry = await recordError(
    {
      title: toErrorTitle(toolName),
      source: "tool_failure",
      priority: "high",
      area: "infra",
      summary: `Tool call failed: ${toolName}`,
      error: errorMessage,
      contextLines: [
        formatContextLine("Hook", "tool_result_persist"),
        formatContextLine("Session", event.sessionKey ?? "unknown"),
        formatContextLine("Tool", toolName),
        formatContextLine("Status", event.status ?? asRecord(event.result)?.status ?? "unknown"),
        formatContextLine("ExitCode", event.exitCode ?? asRecord(event.result)?.exitCode ?? "n/a"),
        formatContextLine("Params", params ?? {}),
      ],
      suggestedFix: "Validate tool parameters and preconditions before calling the tool.",
      metadata: {
        reproducible: "unknown",
        relatedFiles: [],
        seeAlso: [],
        tags: ["hook", "tool", "failure"],
        source: "tool_failure",
      },
    },
    options,
  );

  return { recorded: true, id: entry.id, entry };
}
