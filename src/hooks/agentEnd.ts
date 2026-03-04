import { z } from "zod";

import { formatContextLine, recordError, toErrorTitle } from "../storage/errorWriter.js";
import type { ErrorCaptureResult, ErrorStoreOptions } from "../types/error.js";

const MessageSchema = z
  .object({
    role: z.string().optional(),
    content: z.unknown().optional(),
    text: z.string().optional(),
  })
  .passthrough();

const AgentEndEventSchema = z
  .object({
    sessionKey: z.string().optional(),
    timestamp: z.string().optional(),
    messages: z.array(MessageSchema).optional(),
    conversation: z.array(MessageSchema).optional(),
    userMessage: z.string().optional(),
    assistantMessage: z.string().optional(),
    transcript: z.string().optional(),
  })
  .passthrough();

type AgentEndEvent = z.infer<typeof AgentEndEventSchema>;
type ChatMessage = { role: string; text: string };

const CORRECTION_PATTERNS: Array<{ keyword: string; regex: RegExp }> = [
  { keyword: "不对", regex: /不对/u },
  { keyword: "错了", regex: /错了/u },
  { keyword: "应该是", regex: /应该是/u },
  { keyword: "No", regex: /(^|\b)no([\s,!.?]|$)/i },
];

function flattenContent(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") {
          return part;
        }

        if (part && typeof part === "object" && "text" in part && typeof (part as { text?: unknown }).text === "string") {
          return (part as { text: string }).text;
        }

        return "";
      })
      .filter(Boolean)
      .join("\n");
  }

  if (content && typeof content === "object" && "text" in content && typeof (content as { text?: unknown }).text === "string") {
    return (content as { text: string }).text;
  }

  return "";
}

function normalizeMessages(event: AgentEndEvent): ChatMessage[] {
  const list = event.messages ?? event.conversation ?? [];
  const out: ChatMessage[] = [];

  for (const msg of list) {
    const role = (msg.role ?? "").toLowerCase();
    const text = [msg.text, flattenContent(msg.content)].find((part) => typeof part === "string" && part.trim().length > 0);

    if (!text) {
      continue;
    }

    out.push({ role, text: text.trim() });
  }

  if (event.assistantMessage && event.assistantMessage.trim()) {
    out.push({ role: "assistant", text: event.assistantMessage.trim() });
  }

  if (event.userMessage && event.userMessage.trim()) {
    out.push({ role: "user", text: event.userMessage.trim() });
  }

  return out;
}

function detectCorrectionKeyword(text: string): string | null {
  for (const pattern of CORRECTION_PATTERNS) {
    if (pattern.regex.test(text)) {
      return pattern.keyword;
    }
  }

  return null;
}

function findCorrectionInMessages(messages: ChatMessage[]): { keyword: string; message: string; assistantMessage?: string } | null {
  for (let idx = messages.length - 1; idx >= 0; idx -= 1) {
    const message = messages[idx];
    if (message.role !== "user") {
      continue;
    }

    const keyword = detectCorrectionKeyword(message.text);
    if (!keyword) {
      continue;
    }

    let assistantMessage: string | undefined;
    for (let j = idx - 1; j >= 0; j -= 1) {
      if (messages[j].role === "assistant") {
        assistantMessage = messages[j].text;
        break;
      }
    }

    return { keyword, message: message.text, assistantMessage };
  }

  return null;
}

function findCorrectionInTranscript(transcript: string | undefined): { keyword: string; message: string } | null {
  if (!transcript) {
    return null;
  }

  const lines = transcript.split("\n").map((line) => line.trim()).filter(Boolean);

  for (let idx = lines.length - 1; idx >= 0; idx -= 1) {
    const line = lines[idx];
    const keyword = detectCorrectionKeyword(line);
    if (keyword) {
      return { keyword, message: line };
    }
  }

  return null;
}

export async function handleAgentEnd(eventPayload: unknown, options: ErrorStoreOptions = {}): Promise<ErrorCaptureResult> {
  const parsed = AgentEndEventSchema.safeParse(eventPayload);
  if (!parsed.success) {
    return { recorded: false, reason: "invalid_payload" };
  }

  const event = parsed.data;
  const messages = normalizeMessages(event);
  const correction = findCorrectionInMessages(messages);
  const transcriptCorrection = correction ? null : findCorrectionInTranscript(event.transcript);

  const keyword = correction?.keyword ?? transcriptCorrection?.keyword;
  const userMessage = correction?.message ?? transcriptCorrection?.message;
  const assistantMessage = correction?.assistantMessage;

  if (!keyword || !userMessage) {
    return { recorded: false, reason: "no_correction_keyword" };
  }

  const entry = await recordError(
    {
      title: toErrorTitle(`user_correction_${keyword}`),
      source: "user_correction",
      priority: "high",
      area: "docs",
      summary: `User correction detected (${keyword})`,
      error: "User indicated a previous response was incorrect.",
      contextLines: [
        formatContextLine("Hook", "agent_end"),
        formatContextLine("Session", event.sessionKey ?? "unknown"),
        formatContextLine("Keyword", keyword),
        formatContextLine("UserMessage", userMessage),
        ...(assistantMessage ? [formatContextLine("AssistantMessage", assistantMessage)] : []),
      ],
      suggestedFix: "Re-evaluate the previous response and add a preventive rule if this pattern repeats.",
      metadata: {
        reproducible: "unknown",
        relatedFiles: [],
        seeAlso: [],
        triggerKeyword: keyword,
        tags: ["hook", "user_feedback", "correction"],
        source: "user_correction",
      },
    },
    options,
  );

  return { recorded: true, id: entry.id, entry };
}
