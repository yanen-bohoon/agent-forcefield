import { z } from "zod";

import type { ErrorStoreOptions } from "../types/error.js";
import { recordError, toErrorTitle } from "../storage/errorWriter.js";

const ManualDescriptionSchema = z.string().trim().min(1, "Description is required");

export interface ErrorAddResult {
  id: string;
  message: string;
}

export async function errorAdd(description: string, options: ErrorStoreOptions = {}): Promise<ErrorAddResult> {
  const validatedDescription = ManualDescriptionSchema.parse(description);

  const entry = await recordError(
    {
      title: toErrorTitle(validatedDescription),
      source: "manual",
      priority: "high",
      area: "config",
      summary: validatedDescription,
      error: validatedDescription,
      contextLines: [
        "Command: openclaw forcefield error add <description>",
        `Description: ${validatedDescription}`,
      ],
      suggestedFix: "Convert this error into a concrete prevention rule after verification.",
      metadata: {
        reproducible: "unknown",
        relatedFiles: [],
        seeAlso: [],
        tags: ["manual", "cli"],
        source: "manual",
      },
    },
    options,
  );

  return {
    id: entry.id,
    message: `Added error entry ${entry.id}`,
  };
}
