import { z } from "zod";

export const RuleStatusSchema = z.enum(["active", "archived"]);
export type RuleStatus = z.infer<typeof RuleStatusSchema>;

export const RulePrioritySchema = z.enum(["low", "medium", "high", "critical"]);
export type RulePriority = z.infer<typeof RulePrioritySchema>;

export const RuleEnforcementSchema = z.enum(["soft", "hard"]);
export type RuleEnforcement = z.infer<typeof RuleEnforcementSchema>;

export const RuleTriggerSchema = z.object({
  tools: z.array(z.string()).default([]),
  keywords: z.array(z.string()).default([]),
  context: z.array(z.string()).default([]),
});
export type RuleTrigger = z.infer<typeof RuleTriggerSchema>;

export const RuleFrontmatterSchema = z.object({
  id: z.string().regex(/^RULE-[A-Z0-9\-]+$/),
  title: z.string().trim().min(1),
  status: RuleStatusSchema.default("active"),
  priority: RulePrioritySchema.default("medium"),
  enforcement: RuleEnforcementSchema.default("soft"),
  trigger: RuleTriggerSchema,
  createdAt: z.string().date(),
  sourceErrors: z.array(z.string().regex(/^ERR-\d{8}-[A-Z0-9]{3}$/)).default([]),
});
export type RuleFrontmatter = z.infer<typeof RuleFrontmatterSchema>;

export const RuleDocumentSchema = z.object({
  frontmatter: RuleFrontmatterSchema,
  content: z.string().trim().min(1),
});
export type RuleDocument = z.infer<typeof RuleDocumentSchema>;
