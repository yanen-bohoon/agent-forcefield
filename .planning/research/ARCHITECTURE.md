# Architecture Research

**Domain:** Multi-Agent Rule Enforcement System
**Researched:** 2026-03-04
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ORCHESTRATION LAYER                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │   Cron Runner   │  │  Event Trigger  │  │   CLI / API     │             │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘             │
└───────────┴─────────────────────┴─────────────────────┴─────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       RULE GENERATION LAYER                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    LLM Rule Synthesizer                               │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │   │
│  │  │ Error Parser │→ │ Pattern      │→ │ Rule         │               │   │
│  │  │              │  │ Extractor    │  │ Generator    │               │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        RULE STORAGE LAYER                                    │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐          │
│  │ rules/*.md       │  │ patches/*.md     │  │ .learnings/*.md  │          │
│  │ (Hybrid Format)  │  │ (Corrections)    │  │ (Source Data)    │          │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘          │
└─────────────────────────────────────────────────────────────────────────────┘
         │                                              ▲
         │                                              │
         ▼                                              │
┌─────────────────────────────────────────────────────────────────────────────┐
│                      ENFORCEMENT RUNTIME (Hook-Based)                        │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                    KNOWLEDGE INJECTION LAYER                           │  │
│  │                    Hook: before_prompt_build                            │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                 │  │
│  │  │ Context      │→ │ Rule         │→ │ Prompt       │                 │  │
│  │  │ Analyzer     │  │ Matcher      │  │ Injector     │                 │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘                 │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                    PHYSICAL INTERCEPTION LAYER                         │  │
│  │                    Hook: before_tool_call                               │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                 │  │
│  │  │ Tool Call    │→ │ Rule         │→ │ Action       │                 │  │
│  │  │ Interceptor  │  | Validator    │  │ (Allow/Deny/ │                 │  │
│  │  └──────────────┘  └──────────────┘  │  Transform)  │                 │  │
│  │                                       └──────────────┘                 │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                    ERROR COLLECTION LAYER                               │  │
│  │  Hook: tool_result_persist, agent_end                                   │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                 │  │
│  │  │ Error        │→ │ Context      │→ │ Learning     │                 │  │
│  │  │ Detector     │  │ Enricher     │  │ Writer       │─────────────────┼──┘
│  │  └──────────────┘  └──────────────┘  └──────────────┘                 │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| **Cron Runner** | Periodic rule synthesis trigger | OpenClaw built-in cron, node-cron |
| **Event Trigger** | Real-time error → rule pipeline | Hook-based event emission |
| **CLI / API** | Manual rule management | OpenClaw CLI, REST endpoints |
| **Error Parser** | Extract structured error data from logs/conversations | Regex patterns, LLM extraction |
| **Pattern Extractor** | Identify recurring error patterns | Frequency analysis, clustering |
| **Rule Generator** | Synthesize executable rules from patterns | LLM with structured output |
| **Rule Matcher** | Match current context to applicable rules | Keyword matching, semantic search |
| **Prompt Injector** | Inject rules into agent prompt context | prependContext injection |
| **Tool Call Interceptor** | Intercept tool calls before execution | Hook middleware pattern |
| **Rule Validator** | Check tool params against rules | JSON Schema, custom predicates |
| **Action Executor** | Enforce allow/deny/transform decisions | Return modified params or reject |
| **Error Detector** | Detect failures from tool results | Exception patterns, status codes |
| **Context Enricher** | Add session/agent/task metadata | Session introspection |
| **Learning Writer** | Persist structured learning entries | File system, database |

## Recommended Project Structure

```
agent-forcefield/
├── src/
│   ├── index.ts                    # Plugin entry point
│   ├── hooks/                      # OpenClaw hook implementations
│   │   ├── beforePromptBuild.ts    # Knowledge injection hook
│   │   ├── beforeToolCall.ts       # Physical interception hook
│   │   ├── toolResultPersist.ts    # Error collection hook
│   │   └── agentEnd.ts             # Session completion hook
│   ├── engine/                     # Core enforcement engine
│   │   ├── ruleMatcher.ts          # Rule selection logic
│   │   ├── ruleValidator.ts        # Rule evaluation logic
│   │   └── actionExecutor.ts       # Enforcement actions
│   ├── synthesis/                  # Rule generation layer
│   │   ├── errorParser.ts          # Error extraction
│   │   ├── patternExtractor.ts     # Pattern recognition
│   │   └── ruleGenerator.ts        # LLM-based synthesis
│   ├── storage/                    # Rule persistence
│   │   ├── ruleStore.ts            # Rule CRUD operations
│   │   └── ruleParser.ts           # Hybrid format parser
│   └── types/                      # TypeScript definitions
│       ├── rule.ts                 # Rule types
│       ├── error.ts                # Error types
│       └── hook.ts                 # Hook payload types
├── rules/                          # Rule storage (hybrid format)
│   ├── active/                     # Currently active rules
│   └── archived/                   # Deprecated rules
├── tests/                          # Test suite
│   ├── unit/                       # Unit tests
│   └── integration/                # Hook integration tests
└── package.json
```

### Structure Rationale

- **hooks/**: Isolated hook handlers allow independent testing and clear ownership
- **engine/**: Core logic separated from hook layer enables reuse and testing
- **synthesis/**: Rule generation is a distinct concern with LLM dependency
- **storage/**: Abstracts persistence layer, future-proof for DB migration
- **rules/**: Human-readable, git-diffable rule files for transparency

## Architectural Patterns

### Pattern 1: Hook Chain of Responsibility

**What:** Each hook type chains multiple handlers that can modify or veto the flow.

**When to use:** When multiple enforcement rules may apply to same hook point.

**Trade-offs:**
- ✅ Extensible: new rules add handlers without modifying existing code
- ✅ Ordered: priority-based execution
- ❌ Debugging: chain failures can be hard to trace
- ❌ Performance: each handler adds latency

**Example:**
```typescript
// Hook chain for before_tool_call
type ToolCallHandler = (
  toolName: string,
  params: Record<string, unknown>,
  context: HookContext
) => Promise<{ action: 'allow' | 'deny' | 'transform'; params?: unknown }>;

const handlers: ToolCallHandler[] = [
  gitSafetyHandler,      // Priority 1: Prevent destructive git ops
  pathValidationHandler, // Priority 2: Validate file paths
  rateLimitHandler,      // Priority 3: Check rate limits
];

async function runBeforeToolCallHook(toolName: string, params: unknown, ctx: HookContext) {
  let currentParams = params;
  for (const handler of handlers) {
    const result = await handler(toolName, currentParams, ctx);
    if (result.action === 'deny') {
      throw new RuleViolationError(`Rule denied tool call: ${toolName}`);
    }
    if (result.action === 'transform') {
      currentParams = result.params;
    }
  }
  return currentParams;
}
```

### Pattern 2: Event-Sourced Error Collection

**What:** Errors are captured as immutable events, stored before processing.

**When to use:** When error analysis needs complete history and replay capability.

**Trade-offs:**
- ✅ Audit trail: full history of all errors
- ✅ Replay: can re-process with improved logic
- ❌ Storage: event log grows unbounded
- ❌ Latency: write-before-process adds overhead

**Example:**
```typescript
interface ErrorEvent {
  id: string;
  timestamp: string;
  source: 'tool_failure' | 'user_correction' | 'manual';
  sessionId: string;
  agentId: string;
  toolName?: string;
  errorMessage: string;
  context: Record<string, unknown>;
  rawOutput?: string;
}

// In tool_result_persist hook
async function collectError(result: ToolResult, meta: HookMeta): Promise<void> {
  if (isErrorResult(result)) {
    const event: ErrorEvent = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      source: 'tool_failure',
      sessionId: meta.sessionKey,
      agentId: meta.agentId,
      toolName: meta.toolName,
      errorMessage: extractErrorMessage(result),
      context: extractContext(result),
      rawOutput: result.output,
    };
    await appendToErrorLog(event);
  }
}
```

### Pattern 3: Hybrid Rule Format

**What:** Rules stored as human-readable Markdown with embedded structured metadata.

**When to use:** When rules need both human review and machine execution.

**Trade-offs:**
- ✅ Transparency: humans can read and audit
- ✅ Version control: git-friendly diffs
- ✅ Documentation: rule becomes its own doc
- ❌ Parsing: requires frontmatter + content parsing
- ❌ Validation: easier to have malformed rules

**Example:**
```markdown
---
id: RULE-20260304-001
status: active
priority: high
enforcement: hard
trigger:
  context: [gsd, coding]
  tools: [sessions_spawn]
  keywords: []
created: 2026-03-04
source: ERR-20260304-003
---

# 禁止在 GSD 中直接 sessions_spawn 编码

## 规则

在 GSD 流程中，禁止直接使用 `sessions_spawn` 进行编码任务。

## 正确做法

必须通过 `/gsd execute-phase N` 调用 coder-swarm 执行器。

## 错误示例

```typescript
// ❌ 错误：直接 spawn
sessions_spawn({ runtime: "acp", prompt: "实现登录功能" });

// ✅ 正确：走 GSD 流程
/gsd execute-phase 3
```

## 触发条件

- 任务涉及 coding
- 当前在 GSD 流程中
- 检测到 `sessions_spawn` 调用
```

### Pattern 4: Context-Aware Rule Matching

**What:** Rules are matched based on current session context, not just tool name.

**When to use:** When rules have scope (per-project, per-agent, per-flow).

**Trade-offs:**
- ✅ Precision: rules apply only when relevant
- ✅ Flexibility: same tool can have different rules per context
- ❌ Complexity: context extraction can be fragile
- ❌ Performance: context matching adds latency

**Example:**
```typescript
interface RuleMatchContext {
  agentId: string;
  projectId?: string;
  flowName?: string;        // e.g., 'gsd'
  phaseName?: string;       // e.g., 'phase-3'
  toolName: string;
  recentKeywords: string[];
}

function matchRules(rules: Rule[], ctx: RuleMatchContext): Rule[] {
  return rules.filter(rule => {
    // Must match context constraints
    if (rule.trigger.context?.length) {
      const hasMatchingContext = rule.trigger.context.some(c => 
        ctx.flowName === c || ctx.phaseName === c
      );
      if (!hasMatchingContext) return false;
    }
    
    // Must match tool (if specified)
    if (rule.trigger.tools?.length) {
      if (!rule.trigger.tools.includes(ctx.toolName)) return false;
    }
    
    // Must match keywords (if any required)
    if (rule.trigger.keywords?.length) {
      const hasKeyword = rule.trigger.keywords.some(k =>
        ctx.recentKeywords.includes(k)
      );
      if (!hasKeyword) return false;
    }
    
    return true;
  });
}
```

## Data Flow

### Error → Rule Flow (Automated Pipeline)

```
[Tool Failure / User Correction]
    ↓
[tool_result_persist Hook] ──→ [Error Detector]
    │                               ↓
    │                         [Context Enricher]
    │                               ↓
    │                         [Learning Writer]
    │                               ↓
    │                         [.learnings/ERRORS.md]
    │                               │
    └───────────────────────────────┘
                                    │ (Cron / Event trigger)
                                    ▼
                            [Pattern Extractor]
                                    ↓
                            [Rule Generator (LLM)]
                                    ↓
                            [Rule Validator]
                                    ↓
                            [rules/active/RULE-XXX.md]
```

### Enforcement Flow (Runtime)

```
[Agent Request]
    ↓
[before_prompt_build Hook]
    ↓
[Context Analyzer] ──→ [Rule Matcher] ──→ [Prompt Injector]
    │                                              ↓
    │                                    [Agent Prompt + Rules]
    │                                              ↓
    │                                    [LLM Response]
    │                                              ↓
    │                                    [Tool Call Decision]
    │                                              ↓
    └─────────────────────────────────────→ [before_tool_call Hook]
                                                    ↓
                                            [Tool Call Interceptor]
                                                    ↓
                                            [Rule Validator]
                                                    ↓
                                    ┌───────────────┼───────────────┐
                                    ↓               ↓               ↓
                                [ALLOW]        [DENY]        [TRANSFORM]
                                    ↓               ↓               ↓
                            [Execute Tool]  [Reject + Msg]  [Modified Params]
                                    ↓                               ↓
                            [Tool Result]                    [Execute Tool]
                                    ↓
                    [tool_result_persist Hook]
                                    ↓
                            [Error? → Collect]
```

### Key Data Flows

1. **Error Collection Flow**: Tool failures and user corrections are captured via hooks, enriched with session context, and persisted to `.learnings/`. This is the input to the rule generation pipeline.

2. **Rule Synthesis Flow**: Periodic or event-triggered synthesis reads `.learnings/`, extracts patterns via LLM, generates structured rules, validates them, and writes to `rules/active/`.

3. **Prompt Injection Flow**: Before each LLM call, relevant rules are matched based on context and injected into the prompt's prependContext, ensuring the agent "sees" the rules.

4. **Interception Flow**: Before each tool execution, rules are matched and validated. Violations result in denial or parameter transformation, preventing the error before it occurs.

5. **Feedback Loop**: Interception successes/failures feed back into `.learnings/`, closing the loop.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 1-10 agents | In-memory rule matching, file-based storage sufficient |
| 10-100 agents | Add rule caching, consider rule indexing for fast lookup |
| 100+ agents | Database-backed rule storage, distributed hook processing, rule sharding by agent/project |

### Scaling Priorities

1. **First bottleneck: Rule matching latency**
   - Solution: Index rules by tool name and context tags
   - Cache matched rules per session

2. **Second bottleneck: LLM synthesis cost**
   - Solution: Batch error processing
   - Use cheaper models for pattern extraction, expensive models only for final rule generation

3. **Third bottleneck: Storage growth**
   - Solution: Archive old errors after rule extraction
   - Implement retention policies per project

## Anti-Patterns

### Anti-Pattern 1: Prompt-Only Enforcement

**What people do:** Only inject rules into prompts, trusting the LLM to follow them.

**Why it's wrong:** LLMs are probabilistic; context window pressure causes rule "forgetting". Rules become suggestions, not guarantees.

**Do this instead:** Combine prompt injection with physical interception. Prompt injection for "soft guidance", interception for "hard enforcement".

### Anti-Pattern 2: Monolithic Rule Files

**What people do:** Store all rules in a single large file.

**Why it's wrong:** Hard to find relevant rules, git conflicts, no clear ownership, slow loading.

**Do this instead:** One rule per file with clear naming (`RULE-YYYYMMDD-XXX.md`). Use directory structure for organization (`rules/active/`, `rules/archived/`).

### Anti-Pattern 3: Stateless Rule Matching

**What people do:** Match rules only on current tool name, ignoring session context.

**Why it's wrong:** Same tool may have different rules in different flows (e.g., `sessions_spawn` allowed in direct mode but not in GSD flow).

**Do this instead:** Include flow state, project context, recent conversation keywords in matching criteria.

### Anti-Pattern 4: Silent Rule Violations

**What people do:** When a rule is violated, silently reject or transform without logging.

**Why it's wrong:** User has no visibility into enforcement behavior, debugging is impossible, no feedback loop for rule improvement.

**Do this instead:** Always log enforcement actions with full context. Optionally notify user for high-priority violations.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| OpenClaw Hooks | Plugin API registration | Hooks are the foundation; all layers are hook-based |
| LLM Provider | HTTP API (generation) | Rule synthesis uses same provider as agents |
| Vector DB (optional) | Embedding-based rule matching | For semantic rule matching at scale |
| Notification Service | Webhook / WebSocket | User alerts on enforcement actions |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Error Collection ↔ Synthesis | File-based (.learnings/) | Async, decoupled via filesystem |
| Synthesis ↔ Storage | File-based (rules/) | Human-readable, git-trackable |
| Storage ↔ Enforcement | File read + in-memory cache | Fast lookup, periodic refresh |
| Hooks ↔ Enforcement Engine | Direct function call | Sync, low latency requirement |

## Build Order (Dependency Graph)

```
Phase 1: Foundation (Week 1)
├── 1.1 Rule Storage Layer
│   ├── Rule file format specification
│   ├── Rule parser (frontmatter + content)
│   └── Rule store (CRUD operations)
│
└── 1.2 Error Collection Layer
    ├── Hook: tool_result_persist
    ├── Error detector (failure pattern matching)
    ├── Context enricher (session metadata)
    └── Learning writer (append to .learnings/)

Phase 2: Rule Generation (Week 2)
├── 2.1 Pattern Extraction
│   ├── Error aggregation (group similar errors)
│   └── Pattern identifier (frequency analysis)
│
└── 2.2 Rule Synthesis
    ├── LLM prompt for rule generation
    ├── Rule validator (schema + logic check)
    └── Rule writer (persist to rules/)

Phase 3: Enforcement Runtime (Week 3)
├── 3.1 Knowledge Injection Layer
│   ├── Hook: before_prompt_build
│   ├── Context analyzer (extract current context)
│   ├── Rule matcher (filter applicable rules)
│   └── Prompt injector (prependContext)
│
└── 3.2 Physical Interception Layer
    ├── Hook: before_tool_call
    ├── Tool call interceptor
    ├── Rule validator (check params against rules)
    └── Action executor (allow/deny/transform)

Phase 4: Orchestration (Week 4)
├── 4.1 Cron Integration
│   ├── Periodic synthesis job
│   └── Error cleanup job
│
├── 4.2 CLI / API
│   ├── Manual rule creation
│   ├── Rule listing/search
│   └── Enforcement logs viewer
│
└── 4.3 Monitoring
    ├── Enforcement metrics (allow/deny rates)
    ├── Rule coverage (errors without rules)
    └── Synthesis health (generation success rate)
```

### Build Dependencies

```
[1.1 Rule Storage] ←── ALL OTHER COMPONENTS DEPEND ON THIS
        │
        ▼
[1.2 Error Collection] ──→ [2.1 Pattern Extraction]
        │                           │
        │                           ▼
        └───────────────────→ [2.2 Rule Synthesis]
                                        │
                                        ▼
                              [3.1 Knowledge Injection] ←─┐
                                        │                  │
                                        ▼                  │
                              [3.2 Physical Interception]─┘
                                        │
                                        ▼
                              [4.1-4.3 Orchestration]
```

### Critical Path

1. **Rule Storage (1.1)** → Blocks everything else
2. **Error Collection (1.2)** → Required for synthesis input
3. **Rule Synthesis (2.2)** → Required before enforcement can use generated rules
4. **Physical Interception (3.2)** → Core enforcement capability

## Sources

- OpenClaw Hook API Documentation (dist/subagent-registry-CkqrXKq4.js analysis)
- LangGraph Thread Isolation: https://docs.langchain.com/oss/python/langgraph/persistence
- AutoGen Topic/Source Pattern: https://microsoft.github.io/autogen/0.4.6/user-guide/core-user-guide/core-concepts/topic-and-subscription.html
- CrewAI Memory Scoping: https://docs.crewai.com/en/concepts/memory
- self-improving-agent Skill: ~/.openclaw/workspace/skills/self-improving-agent/SKILL.md
- Multi-Agent Isolation Research: ~/.openclaw/workspace/ops/output/deep-search/multi-agent-isolation-20260224-015912.md
- OWASP AI Agent Security: https://cheatsheetseries.owasp.org/cheatsheets/AI_Agent_Security_Cheat_Sheet.html

---
*Architecture research for: Multi-Agent Rule Enforcement System (Agent Forcefield)*
*Researched: 2026-03-04*