# Research Summary: Agent Forcefield

**Project:** Multi-Agent Rule Enforcement System with Hooks and Automated Learning Loops
**Researched:** 2026-03-04
**Confidence:** HIGH (Stack), MEDIUM (Features, Pitfalls), HIGH (Architecture)

---

## Executive Summary

Agent Forcefield is an OpenClaw plugin that enforces rules on AI agents through **proactive injection** and **physical interception**. Unlike passive logging systems, it prevents violations before they occur and automatically learns from errors to generate new rules.

### Core Value Proposition
- **"Today's bug, tomorrow's patch"** — Automated rule generation from errors
- **Proactive, not reactive** — Rules injected before agent sees the prompt
- **Physical enforcement** — Tool calls intercepted and blocked/modified before execution
- **Closed-loop automation** — Error → Rule → Injection → Verification without human intervention

---

## Recommended Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Language** | TypeScript 5.9.x | Native OpenClaw stack, strong typing for rules |
| **Runtime** | Node.js 24.x LTS | OpenClaw target, native ESM support |
| **Schema/Validation** | Zod 4.3.x + TypeBox 0.34.x | Runtime validation + JSON Schema generation |
| **Rule Engine** | json-rules-engine 7.3.x (optional) | Complex conditional rules; Zod for simple validation |
| **Storage** | better-sqlite3 12.6.x + sqlite-vec 0.1.x | Local-first, synchronous (fast hooks), vector similarity |
| **Async Processing** | p-queue 8.x (MVP) / BullMQ 5.70.x (production) | Learning loop job queue |
| **Logging** | pino 10.3.x | Already in OpenClaw, fastest Node.js logger |
| **Testing** | vitest 4.0.x | Fast, native TypeScript |

### Key Integration Points
- **OpenClaw Hooks:** `before_prompt_build`, `before_tool_call`, `after_tool_call`, `agent_end`
- **Rule Format:** Hybrid Markdown with YAML frontmatter (human-readable, git-diffable)
- **Storage Pattern:** File-based `rules/*.md` for transparency, SQLite for fast lookup

---

## Feature Scope

### MVP (v1) — Must Have

| Feature | Priority | Complexity | Notes |
|---------|----------|------------|-------|
| Error Detection & Collection | P1 | LOW | Hook into `tool_result_persist`, detect failures |
| Automated Rule Generation | P1 | HIGH | LLM-powered extraction from `.learnings/*.md` |
| Rule Persistence | P1 | LOW | File-based `rules/*.md` storage |
| Manual Rule Entry | P1 | LOW | CLI/API to write rules directly |
| Basic Notification | P1 | MEDIUM | Notify when new rule generated |
| Rule Viewing | P1 | LOW | CLI command `forcefield list` |
| Closed-Loop Automation | P1 | MEDIUM | Cron job: errors → rules → merge |

### Post-MVP (v1.x) — Should Have

| Feature | Priority | Complexity | Notes |
|---------|----------|------------|-------|
| Rollback & Versioning | P2 | MEDIUM | Safety net for automated rules |
| Rule Confidence Scoring | P2 | MEDIUM | Track recurrence, source quality |
| Multi-Agent Rule Sharing | P2 | MEDIUM | Shared `rules/` namespace |
| Knowledge Injection at Prompt Time | P2 | HIGH | `before_prompt_build` hook |

### Future (v2+) — Nice to Have

| Feature | Priority | Complexity | Notes |
|---------|----------|------------|-------|
| Tool Call Interception & Correction | P3 | HIGH | `before_tool_call` hook |
| Cross-Project Rule Portability | P3 | LOW | Export/import CLI |
| Rule Analytics Dashboard | P3 | HIGH | Visualization |
| A/B Testing for Rules | P3 | HIGH | Compare rule versions |

### Anti-Features (Avoid)

| Feature | Why Problematic | Alternative |
|---------|-----------------|-------------|
| "Block All Unknown Actions" | Too restrictive, agent paralysis | Warn + log default, escalate after N violations |
| "Real-Time Rule Sync" | Race conditions, debugging nightmare | Batch sync with versioning |
| "Learn from Every Error" | Noise pollution, low signal | Require recurrence threshold (3+ similar errors) |
| "Natural Language Rules Only" | Ambiguous, hard to enforce | Hybrid: NL description + structured trigger/action |

---

## Architecture Overview

### System Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                    ORCHESTRATION LAYER                          │
│  Cron Runner  │  Event Trigger  │  CLI / API                    │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                  RULE GENERATION LAYER                          │
│  Error Parser → Pattern Extractor → Rule Generator (LLM)        │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    RULE STORAGE LAYER                           │
│  rules/*.md (active)  │  patches/*.md  │  .learnings/*.md       │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│               ENFORCEMENT RUNTIME (Hook-Based)                  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ KNOWLEDGE INJECTION (before_prompt_build)               │   │
│  │ Context Analyzer → Rule Matcher → Prompt Injector        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ PHYSICAL INTERCEPTION (before_tool_call)                │   │
│  │ Tool Interceptor → Rule Validator → Action Executor     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ERROR COLLECTION (tool_result_persist, agent_end)       │   │
│  │ Error Detector → Context Enricher → Learning Writer     │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Project Structure

```
agent-forcefield/
├── src/
│   ├── index.ts                    # Plugin entry point
│   ├── hooks/                      # OpenClaw hook implementations
│   │   ├── beforePromptBuild.ts    # Knowledge injection
│   │   ├── beforeToolCall.ts       # Physical interception
│   │   ├── toolResultPersist.ts    # Error collection
│   │   └── agentEnd.ts             # Session completion
│   ├── engine/                     # Core enforcement engine
│   │   ├── ruleMatcher.ts          # Rule selection logic
│   │   ├── ruleValidator.ts       # Rule evaluation logic
│   │   └── actionExecutor.ts       # Enforcement actions
│   ├── synthesis/                  # Rule generation layer
│   │   ├── errorParser.ts          # Error extraction
│   │   ├── patternExtractor.ts     # Pattern recognition
│   │   └── ruleGenerator.ts        # LLM-based synthesis
│   ├── storage/                    # Rule persistence
│   │   ├── ruleStore.ts            # Rule CRUD operations
│   │   └── ruleParser.ts           # Hybrid format parser
│   └── types/                      # TypeScript definitions
├── rules/                          # Rule storage (hybrid format)
│   ├── active/                     # Currently active rules
│   └── archived/                   # Deprecated rules
└── tests/
```

### Key Data Flows

1. **Error → Rule Flow:** Tool failure → Hook capture → `.learnings/` → Pattern extraction → LLM synthesis → `rules/active/`
2. **Enforcement Flow:** Agent request → `before_prompt_build` (inject rules) → LLM response → `before_tool_call` (validate) → Allow/Deny/Transform
3. **Feedback Loop:** Interception results → `.learnings/` → Rule refinement

---

## Critical Pitfalls

### Must Prevent

| Pitfall | Why It Happens | Prevention |
|---------|----------------|------------|
| **Memory/Rule Amnesia** | LLMs have no persistent state; memory retrieval not automatic | Mandatory memory pre-check hooks; active constraints, not passive reference |
| **Context Rot** | Attention decay for tokens far from current focus | Rule injection at strategic points; priority markers; rule refresh triggers |
| **Premature Victory** | Models optimize for completion signals; no verification | External verification hooks; evaluator-optimizer pattern; evidence required |
| **Passive Enforcement** | Logging is easier than intervention; fear of false positives | Define enforcement actions (warn/block/correct); graduated response; feedback loops |

### Technical Debt to Avoid

| Shortcut | Long-term Cost |
|----------|----------------|
| Store rules in prompt only | Rules lost on context reset |
| Log violations without action | No actual enforcement |
| Single agent for all enforcement | Doesn't scale |
| Hard-coded rule checks | Inflexible, can't adapt |
| Skip verification step | Undetected violations |
| No rollback mechanism | Can't recover from errors |

### Security Considerations

| Risk | Prevention |
|------|------------|
| Rule injection via user input | Sanitize all rule content, use allowlists |
| Agent privilege escalation | Hard constraints that agents cannot modify |
| Rule tampering in transit | Cryptographic signing of rule payloads |
| Cross-agent rule leakage | Strict rule namespacing per agent/session |

---

## Build Order

### Phase 1: Foundation (Week 1)

```
├── 1.1 Rule Storage Layer
│   ├── Rule file format specification (hybrid Markdown + YAML)
│   ├── Rule parser (frontmatter + content)
│   └── Rule store (CRUD operations)
│
└── 1.2 Error Collection Layer
    ├── Hook: tool_result_persist
    ├── Error detector (failure pattern matching)
    ├── Context enricher (session metadata)
    └── Learning writer (append to .learnings/)
```

### Phase 2: Rule Generation (Week 2)

```
├── 2.1 Pattern Extraction
│   ├── Error aggregation (group similar errors)
│   └── Pattern identifier (frequency analysis)
│
└── 2.2 Rule Synthesis
    ├── LLM prompt for rule generation
    ├── Rule validator (schema + logic check)
    └── Rule writer (persist to rules/)
```

### Phase 3: Enforcement Runtime (Week 3)

```
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
```

### Phase 4: Orchestration (Week 4)

```
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

### Critical Path

1. **Rule Storage (1.1)** → Blocks everything else
2. **Error Collection (1.2)** → Required for synthesis input
3. **Rule Synthesis (2.2)** → Required before enforcement can use generated rules
4. **Physical Interception (3.2)** → Core enforcement capability

---

## Success Criteria

### MVP Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Error → Rule conversion rate | > 80% of recurring errors get rules | Count errors with/without rules |
| Rule enforcement accuracy | < 5% false positive blocks | Manual audit of blocked actions |
| Rule relevance | > 70% of generated rules are kept (not deleted) | Rule retention rate |
| Time to rule | < 24 hours from error to active rule | Timestamp tracking |
| User intervention reduction | 50% fewer manual corrections | Compare before/after error rates |

### Quality Gates

- [ ] Agent starts new session and correctly retrieves rules (Memory Amnesia prevention)
- [ ] 100-turn session maintains rule compliance (Context Rot prevention)
- [ ] "Done" claim triggers automated compliance check (Premature Victory prevention)
- [ ] Post-compaction agent still follows nuanced rules (Rule Erosion prevention)
- [ ] 3+ concurrent agents don't conflict (Multi-Agent Chaos prevention)
- [ ] Violation triggers action, not just log (Passive Enforcement prevention)

---

## Sources

- **Stack Research:** npm registry, OpenClaw source analysis, json-rules-engine docs, Zod docs
- **Feature Research:** self-improving-agent implementation, multi-agent isolation research, OWASP Agent Security
- **Architecture Research:** OpenClaw Hook API, LangGraph thread isolation, AutoGen topic/source pattern, CrewAI memory scoping
- **Pitfalls Research:** Anthropic "Building Effective AI Agents", "Effective Harnesses for Long-Running Agents", MCP specification

---

## Next Steps

1. **Validate stack choices** with proof-of-concept for hook integration
2. **Define rule schema** in detail (YAML frontmatter structure)
3. **Design error taxonomy** for pattern extraction
4. **Create LLM prompts** for rule synthesis
5. **Build Phase 1** (Rule Storage + Error Collection)

---

*Research synthesized for: Agent Forcefield (Multi-Agent Rule Enforcement System)*
*Target: OpenClaw Plugin, TypeScript/Node.js*
*Generated: 2026-03-04*