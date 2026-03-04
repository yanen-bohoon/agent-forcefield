import { z } from "zod";

export const ErrorSourceSchema = z.enum(["tool_failure", "user_correction", "manual"]);
export type ErrorSource = z.infer<typeof ErrorSourceSchema>;

export const ErrorPrioritySchema = z.enum(["low", "medium", "high", "critical"]);
export type ErrorPriority = z.infer<typeof ErrorPrioritySchema>;

export const ErrorStatusSchema = z.enum(["pending", "in_progress", "resolved", "wont_fix", "promoted"]);
export type ErrorStatus = z.infer<typeof ErrorStatusSchema>;

export const ErrorAreaSchema = z.enum(["frontend", "backend", "infra", "tests", "docs", "config"]);
export type ErrorArea = z.infer<typeof ErrorAreaSchema>;

export const ReproducibleSchema = z.enum(["yes", "no", "unknown"]);
export type Reproducible = z.infer<typeof ReproducibleSchema>;

export const ErrorContextSchema = z
  .object({
    sessionKey: z.string().optional(),
    timestamp: z.string().datetime({ offset: true }).optional(),
    toolName: z.string().optional(),
    toolParams: z.unknown().optional(),
    command: z.string().optional(),
    errorMessage: z.string().optional(),
    userMessage: z.string().optional(),
    assistantMessage: z.string().optional(),
    triggerKeyword: z.string().optional(),
    rawEvent: z.unknown().optional(),
  })
  .passthrough();
export type ErrorContext = z.infer<typeof ErrorContextSchema>;

export const ErrorMetadataSchema = z
  .object({
    reproducible: ReproducibleSchema.default("unknown"),
    relatedFiles: z.array(z.string()).default([]),
    seeAlso: z.array(z.string()).default([]),
    source: ErrorSourceSchema.optional(),
    triggerKeyword: z.string().optional(),
    tags: z.array(z.string()).default([]),
  })
  .default({
    reproducible: "unknown",
    relatedFiles: [],
    seeAlso: [],
    tags: [],
  });
export type ErrorMetadata = z.infer<typeof ErrorMetadataSchema>;

export const ErrorEntryIdSchema = z.string().regex(/^ERR-\d{8}-[A-Z0-9]{3}$/);

export const ErrorEntrySchema = z.object({
  id: ErrorEntryIdSchema,
  title: z.string().trim().min(1),
  source: ErrorSourceSchema,
  loggedAt: z.string().datetime({ offset: true }),
  priority: ErrorPrioritySchema,
  status: ErrorStatusSchema,
  area: ErrorAreaSchema,
  summary: z.string().trim().min(1),
  error: z.string().trim().min(1).optional(),
  contextLines: z.array(z.string()).default([]),
  suggestedFix: z.string().trim().min(1).optional(),
  metadata: ErrorMetadataSchema,
});
export type ErrorEntry = z.infer<typeof ErrorEntrySchema>;

export const ErrorWriteInputSchema = z.object({
  title: z.string().trim().min(1),
  source: ErrorSourceSchema,
  priority: ErrorPrioritySchema.default("high"),
  area: ErrorAreaSchema.default("infra"),
  summary: z.string().trim().min(1),
  error: z.string().trim().min(1).optional(),
  contextLines: z.array(z.string()).default([]),
  suggestedFix: z.string().trim().min(1).optional(),
  metadata: ErrorMetadataSchema.optional(),
});
export type ErrorWriteInput = z.infer<typeof ErrorWriteInputSchema>;

export type ErrorCaptureResult =
  | { recorded: true; id: string; entry: ErrorEntry }
  | { recorded: false; reason: string };

export interface ErrorStoreOptions {
  cwd?: string;
  now?: () => Date;
}
