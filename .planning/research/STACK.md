# Stack Research

**Domain:** Multi-Agent Rule Enforcement System with Hooks and Automated Learning Loops
**Researched:** 2026-03-04
**Confidence:** HIGH (verified via npm registry and OpenClaw source analysis)

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **TypeScript** | 5.9.x | Primary language | Native OpenClaw stack, strong typing for rule definitions, excellent inference for JSON schema validation |
| **Node.js** | 24.x LTS | Runtime | OpenClaw target platform, native ESM support, performant async hooks |
| **Zod** | 4.3.x | Schema validation & rule DSL | TypeScript-first, runtime validation, excellent error messages, `.passthrough()` for flexible rules, `z.discriminatedUnion()` for rule types |
| **@sinclair/typebox** | 0.34.x | JSON Schema generation | Already used in OpenClaw plugins, generates JSON Schema for tool guardrails, zero dependencies |
| **@standard-schema/spec** | 1.1.x | Schema interoperability | Emerging standard for cross-library validation (Zod, TypeBox, Valibot), future-proof |

### Rule Engine & Enforcement

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **json-rules-engine** | 7.3.x | Declarative rule evaluation | When rules need complex conditions (AND/OR/NOT), fact-based evaluation, priority-based execution |
| **Zod schemas** | 4.3.x | Guardrail validation | For `before_tool_call` hook parameter validation, structured output constraints |
| **Custom DSL** | — | Agent-specific rules | When json-rules-engine is too limiting; use Zod + TypeScript for type-safe rules |

### OpenClaw Hook Integration

| Hook Event | Purpose | Implementation Pattern |
|------------|---------|------------------------|
| `before_prompt_build` | Proactive Injection | Return `{ systemPromptAdditions: string[], contextAdditions: string[] }` to inject rules into agent context |
| `before_tool_call` | Deterministic Guardrail | Return `{ block: true, blockReason: string }` or `{ params: ModifiedParams }` to block or modify tool calls |
| `after_tool_call` | Learning Loop Trigger | Observe tool results, detect errors, queue for rule extraction |
| `agent_end` | Session Learning | Analyze full conversation, extract patterns, merge into rule store |

### Memory & Learning Storage

| Library | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| **better-sqlite3** | 12.6.x | Local rule persistence | Synchronous API (faster for hooks), no external dependencies, already proven in OpenClaw ecosystem |
| **sqlite-vec** | 0.1.x | Vector similarity for rules | Find similar past mistakes, avoid duplicate rules, local-first (no cloud dependency) |
| **mem0ai** | 2.2.x | Structured memory layer | Optional: when you want managed memory with automatic extraction; has OpenAI integration built-in |

### Async Processing (Learning Loop)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **p-queue** | 8.x | In-memory job queue | MVP: Simple, zero-config, sufficient for single-instance learning loops |
| **BullMQ** | 5.70.x | Persistent job queue | Production: When you need durability, retries, distributed processing |
| **ioredis** | 5.10.x | Redis client (for BullMQ) | Only if using BullMQ |

### Observability

| Library | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| **pino** | 10.3.x | Structured logging | Already used in OpenClaw, fastest Node.js logger, JSON output for analysis |
| **@opentelemetry/api** | 1.9.x | Tracing | Hook timing, rule evaluation metrics, optional export to Jaeger/Tempo |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| **vitest** | 4.0.x | Testing framework | Vite-powered, fast, native TypeScript, great for testing hook handlers |
| **tsx** | 4.21.x | TypeScript execution | Development server, already used in OpenClaw plugins |
| **oclif** | 4.22.x | CLI scaffolding | If plugin needs CLI commands (e.g., `forcefield rules list`) |

## Installation

```bash
# Core
npm install zod @sinclair/typebox @standard-schema/spec

# Rule Engine (choose one)
npm install json-rules-engine  # Declarative rules
# OR use Zod directly for simpler validation-based rules

# Storage
npm install better-sqlite3 sqlite-vec

# Optional: Managed Memory
npm install mem0ai

# Async Processing
npm install p-queue  # MVP
# OR
npm install bullmq ioredis  # Production

# Observability (pino already in OpenClaw)
npm install @opentelemetry/api

# Dev Dependencies
npm install -D typescript vitest tsx @types/better-sqlite3
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| **Zod** | Valibot | When bundle size is critical (Valibot is smaller), but Zod has better TypeScript inference |
| **better-sqlite3** | @electric-sql/pglite | When you need PostgreSQL compatibility or WASM portability, but adds complexity |
| **json-rules-engine** | Custom DSL | When rules are simple (just parameter validation), use Zod directly; json-rules-engine adds value for complex conditional logic |
| **p-queue** | BullMQ | When single-instance is sufficient; BullMQ adds Redis dependency but enables durability and horizontal scaling |
| **TypeBox** | zod-to-json-schema | When you need JSON Schema output from Zod schemas, but TypeBox is cleaner (generates directly) |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **LangChain** | Overkill for rule enforcement; high abstraction cost, slow startup, adds 50+ dependencies | Direct OpenAI SDK or Vercel AI SDK |
| **Temporal** | Workflow engine suited for long-running processes, not real-time hooks | BullMQ (if needed) or p-queue |
| **Firebase/Supabase** | Adds external dependency for rule storage; network latency unacceptable for synchronous hooks | SQLite (local-first) |
| **Python frameworks** (LangGraph Python, AutoGen) | Language mismatch with OpenClaw (TypeScript/Node.js) | LangGraph.js if multi-agent orchestration needed |
| **Express middleware pattern** | Not how OpenClaw hooks work; hooks are event-based, not HTTP middleware | OpenClaw hook registry pattern |
| **GraphQL** | Adds complexity for simple rule CRUD | REST or direct SQLite queries |

## Stack Patterns by Variant

**If MVP / Single Instance:**
- Use: Zod + better-sqlite3 + p-queue + pino
- Because: Zero external dependencies, synchronous hooks (fast), local persistence
- Deployment: Single OpenClaw plugin, no infrastructure

**If Production / Multi-Instance:**
- Use: Zod + better-sqlite3 (per-instance) + BullMQ + Redis + OpenTelemetry
- Because: Distributed rule sync via Redis pub/sub, durable job processing, observability
- Deployment: OpenClaw plugin + Redis sidecar

**If Complex Rules (conditional logic, priorities, fact-based):**
- Use: json-rules-engine + Zod (for fact schema) + SQLite
- Because: Declarative rules are auditable, version-controllable, and allow non-developers to modify rules
- Trade-off: Slightly slower than raw Zod validation

## OpenClaw Plugin Architecture

```typescript
// Plugin structure for Agent Forcefield
// ~/.openclaw/extensions/forcefield/
// ├── openclaw.plugin.json
// ├── package.json
// ├── src/
// │   ├── index.ts           # Plugin entry, register hooks
// │   ├── hooks/
// │   │   ├── beforePromptBuild.ts  # Proactive injection
// │   │   ├── beforeToolCall.ts     # Guardrail
// │   │   └── afterToolCall.ts      # Learning trigger
// │   ├── rules/
// │   │   ├── store.ts      # SQLite rule persistence
// │   │   ├── evaluator.ts  # Rule evaluation engine
// │   │   └── extractor.ts  # Error → rule extraction
// │   └── learning/
// │       ├── loop.ts        # Automated learning loop
// │       └── merger.ts      # Rule deduplication/merge
// └── tests/
```

### Hook Handler Patterns

```typescript
// before_prompt_build: Proactive Injection
async function beforePromptBuild(event, ctx) {
  const rules = await ruleStore.getActiveRules(event.sessionKey);
  return {
    systemPromptAdditions: [
      `## Active Constraints\n${rules.map(r => `- ${r.description}`).join('\n')}`
    ]
  };
}

// before_tool_call: Deterministic Guardrail
async function beforeToolCall(event, ctx) {
  const { tool, params } = event;
  const guardrails = await ruleStore.getGuardrails(tool);
  
  for (const guard of guardrails) {
    const result = guard.validate(params);
    if (!result.valid) {
      return { block: true, blockReason: result.error };
    }
  }
  return { params }; // Allow or modify
}

// after_tool_call: Learning Loop
async function afterToolCall(event, ctx) {
  const { tool, params, result, error } = event;
  if (error && error.isPreventable) {
    await learningQueue.add('extract-rule', { tool, params, error });
  }
}
```

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| TypeScript 5.9 | Node.js 22+, 24+ | Native ESM support, satisfies NodeNext module resolution |
| Zod 4.x | TypeScript 5.4+ | Breaking changes from Zod 3.x (improved inference) |
| better-sqlite3 12.x | Node.js 22+ | Prebuilds available for major platforms; requires compile on Alpine |
| sqlite-vec | better-sqlite3 | Load as extension via `db.loadExtension()` |
| BullMQ 5.x | ioredis 5.x | Redis 6.2+ required for streams |
| pino 10.x | Node.js 18+ | Uses worker threads for transports |

## Sources

- **npm registry** — Version verification for all packages (2026-03-04)
- **OpenClaw source** — `dist/deliver-DCtqEVTU.js` for hook API patterns (before_prompt_build, before_tool_call, after_tool_call)
- **OpenClaw bundled hooks** — `dist/bundled/*/HOOK.md` for hook registration patterns and metadata structure
- **OpenClaw feishu plugin** — `~/.openclaw/extensions/feishu/` for plugin architecture reference
- **json-rules-engine docs** — Rule structure and fact-based evaluation patterns
- **Zod docs** — Schema validation patterns, discriminated unions for rule types
- **Vercel AI SDK docs** — Tool calling patterns and structured output (ai 6.0+)

---
*Stack research for: Multi-Agent Rule Enforcement System (Agent Forcefield)*
*Target: OpenClaw Plugin, TypeScript/Node.js*
*Researched: 2026-03-04*