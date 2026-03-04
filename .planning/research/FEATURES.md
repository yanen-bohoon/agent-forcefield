# Feature Research

**Domain:** Multi-Agent Rule Enforcement Systems
**Researched:** 2026-03-04
**Confidence:** MEDIUM (based on existing self-improving-agent implementation, OpenClaw docs, and multi-agent isolation research)

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Error Logging** | Basic observability — "what went wrong?" | LOW | Already exists in self-improving-agent via `.learnings/ERRORS.md` |
| **Learning Capture** | System must remember corrections | LOW | Already exists via `.learnings/LEARNINGS.md` |
| **Manual Rule Entry** | Users need to add rules directly | LOW | CLI/API to write `rules/*.md` |
| **Rule Persistence** | Rules must survive restarts | LOW | File-based storage (`rules/*.md`) |
| **Basic Notification** | Users want to know when rules are added/merged | MEDIUM | Feishu/Discord webhook or in-app notification |
| **Rule Viewing** | "What rules does this agent have?" | LOW | CLI command `forcefield list` or API |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Automated Rule Generation** | Eliminates manual rule writing; "Today's bug, tomorrow's patch" | HIGH | LLM-powered extraction from `.learnings/*.md`; Core MVP feature |
| **Knowledge Injection at Prompt Time** | Rules injected BEFORE agent sees the prompt — proactive, not reactive | HIGH | `before_prompt_build` hook; Phase 2 feature |
| **Tool Call Interception & Correction** | Physical enforcement — prevents bad actions, not just warns | HIGH | `before_tool_call` hook; Phase 3 feature |
| **Closed-Loop Automation** | Error → Rule → Injection → Verification without human intervention | HIGH | Cron job + validation; Core MVP feature |
| **Multi-Agent Rule Sharing** | Rules learned by Agent A apply to Agent B — network effect | MEDIUM | Shared `rules/` namespace + agent-specific overrides |
| **Rule Confidence Scoring** | "How reliable is this rule?" — helps prioritize and audit | MEDIUM | Track recurrence, source quality, override history |
| **Rollback & Versioning** | Bad rule? Revert it — safety net for automation | MEDIUM | Git-based or snapshot-based versioning |
| **Cross-Project Rule Portability** | Export/import rules between projects | LOW | Simple file copy or CLI command |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **"Block All Unknown Actions"** | Security-conscious users want strict defaults | Too restrictive; blocks legitimate exploration; creates agent paralysis | Use "warn + log" default, escalate to "block" after N violations |
| **"Real-Time Rule Sync Across All Agents"** | Enterprise wants centralized control | Race conditions; partial updates cause inconsistent behavior; debugging nightmare | Batch sync with versioning; explicit "push to agents" action |
| **"Learn from Every Error Automatically"** | Set-and-forget automation | Noise pollution; one-off errors become permanent rules; low signal-to-noise | Require recurrence threshold (3+ similar errors) before rule creation |
| **"Natural Language Rules Only"** | Users don't want to learn rule syntax | Ambiguous; LLM interpretation varies; hard to enforce deterministically | Hybrid format: natural language description + structured trigger/action |
| **"Override LLM Decision on Every Tool Call"** | Maximum control | Latency explosion; defeats agent autonomy; user becomes bottleneck | Selective interception — only for known violation patterns |
| **"Global Rules with No Exceptions"** | Consistency across all agents | Context matters; valid actions in one project are invalid in another | Namespace-scoped rules with inheritance: `global` → `project` → `agent` |

## Feature Dependencies

```
[Error Detection & Collection]
    └──requires──> [Error Logging (Table Stakes)]
    └──requires──> [Learning Capture (Table Stakes)]

[Automated Rule Generation]
    └──requires──> [Error Detection & Collection]
    └──requires──> [Rule Persistence (Table Stakes)]
    └──requires──> [Manual Rule Entry (Table Stakes)]

[Knowledge Injection at Prompt Time]
    └──requires──> [Automated Rule Generation]
    └──requires──> [Rule Persistence (Table Stakes)]
    └──requires──> [Multi-Agent Rule Sharing]

[Tool Call Interception & Correction]
    └──requires──> [Automated Rule Generation]
    └──requires──> [Rule Persistence (Table Stakes)]
    └──requires──> [Rule Confidence Scoring] ← for "block vs warn" decisions

[Closed-Loop Automation]
    └──requires──> [Automated Rule Generation]
    └──requires──> [Basic Notification]
    └──requires──> [Rollback & Versioning] ← safety net

[Multi-Agent Rule Sharing]
    └──requires──> [Rule Persistence (Table Stakes)]
    └──requires──> [Rule Viewing (Table Stakes)]

[Rule Confidence Scoring] ──enhances──> [Tool Call Interception]
[Rule Confidence Scoring] ──enhances──> [Automated Rule Generation]

[Rollback & Versioning] ──enhances──> [Closed-Loop Automation]
[Rollback & Versioning] ──enhances──> [Multi-Agent Rule Sharing]

[Real-Time Rule Sync] ──conflicts──> [Rollback & Versioning] ← sync can overwrite rollback
[Learn from Every Error] ──conflicts──> [Rule Confidence Scoring] ← low-quality rules dilute confidence
```

### Dependency Notes

- **Automated Rule Generation requires Error Detection & Collection**: Cannot generate rules without raw error data.
- **Knowledge Injection requires Automated Rule Generation**: Injection needs structured rules to inject.
- **Tool Call Interception requires Rule Confidence Scoring**: Blocking actions needs confidence threshold to avoid false positives.
- **Closed-Loop Automation requires Rollback & Versioning**: Automation without safety net is dangerous.
- **Multi-Agent Rule Sharing enhances Closed-Loop Automation**: Rules learned by one agent benefit all.
- **Real-Time Rule Sync conflicts with Rollback & Versioning**: Synchronous sync can overwrite rollback snapshots; prefer batch sync.

## MVP Definition

### Launch With (v1)

Minimum viable product — what's needed to validate the concept.

- [x] **Error Detection & Collection** — Hook into `tool_result_persist` and detect user corrections; foundation for everything
- [x] **Automated Rule Generation** — LLM-powered extraction from `.learnings/*.md`; core differentiator
- [x] **Rule Persistence** — File-based `rules/*.md` storage
- [x] **Manual Rule Entry** — CLI/API to write rules directly
- [x] **Basic Notification** — Notify user when new rule is generated (non-blocking)
- [x] **Rule Viewing** — CLI command to list current rules
- [ ] **Closed-Loop Automation** — Cron job to process errors → generate rules → merge (partial: needs validation)

### Add After Validation (v1.x)

Features to add once core is working.

- [ ] **Rollback & Versioning** — Safety net for automated rules
- [ ] **Rule Confidence Scoring** — Track recurrence, source quality
- [ ] **Multi-Agent Rule Sharing** — Shared `rules/` namespace
- [ ] **Knowledge Injection at Prompt Time** — `before_prompt_build` hook integration

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] **Tool Call Interception & Correction** — `before_tool_call` hook; high complexity, high value
- [ ] **Cross-Project Rule Portability** — Export/import CLI commands
- [ ] **Rule Analytics Dashboard** — Visualization of rule effectiveness
- [ ] **A/B Testing for Rules** — Compare rule versions

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Error Detection & Collection | HIGH | LOW | P1 |
| Automated Rule Generation | HIGH | HIGH | P1 |
| Rule Persistence | HIGH | LOW | P1 |
| Manual Rule Entry | MEDIUM | LOW | P1 |
| Basic Notification | MEDIUM | MEDIUM | P1 |
| Rule Viewing | MEDIUM | LOW | P1 |
| Closed-Loop Automation | HIGH | MEDIUM | P1 |
| Rollback & Versioning | HIGH | MEDIUM | P2 |
| Rule Confidence Scoring | MEDIUM | MEDIUM | P2 |
| Multi-Agent Rule Sharing | HIGH | MEDIUM | P2 |
| Knowledge Injection at Prompt Time | HIGH | HIGH | P2 |
| Tool Call Interception & Correction | HIGH | HIGH | P3 |
| Cross-Project Rule Portability | LOW | LOW | P3 |
| Rule Analytics Dashboard | MEDIUM | HIGH | P3 |
| A/B Testing for Rules | LOW | HIGH | P3 |

**Priority key:**
- P1: Must have for launch (MVP)
- P2: Should have, add when possible
- P3: Nice to have, future consideration

## Competitor Feature Analysis

| Feature | self-improving-agent (Current) | Agent Forcefield (Target) | Our Approach |
|---------|-------------------------------|---------------------------|--------------|
| Error Logging | ✅ Manual logging via `.learnings/ERRORS.md` | ✅ Automatic via hooks | Hook-based automation |
| Learning Capture | ✅ Manual logging via `.learnings/LEARNINGS.md` | ✅ Automatic detection | Pattern matching + LLM classification |
| Rule Generation | ❌ Manual — user writes rules | ✅ Automated from errors | LLM-powered extraction + human review |
| Knowledge Injection | ❌ Passive — agent may not search RAG | ✅ Active — injected before prompt | `before_prompt_build` hook |
| Tool Interception | ❌ None | ✅ Physical enforcement | `before_tool_call` hook |
| Multi-Agent Sharing | ❌ Per-agent `.learnings/` | ✅ Shared `rules/` namespace | Namespace-scoped rules with inheritance |
| Closed-Loop Automation | ❌ Manual promotion to CLAUDE.md/AGENTS.md | ✅ Cron job + auto-merge | "Today's bug, tomorrow's patch" |

## Sources

- **Existing Implementation**: `~/.openclaw/workspace/skills/self-improving-agent/SKILL.md` — passive learning logs, manual promotion workflow
- **Multi-Agent Isolation Research**: `~/.openclaw/workspace/ops/output/deep-search/multi-agent-isolation-20260224-015912.md` — namespace isolation patterns from LangGraph, CrewAI, OpenClaw
- **OpenClaw Integration**: `~/.openclaw/workspace/skills/self-improving-agent/references/openclaw-integration.md` — hook events, session tools, promotion workflow
- **Project Context**: `~/.openclaw/projects/agent-forcefield/.planning/PROJECT.md` — problem statement, solution architecture, constraints
- **OWASP Agent Security**: https://cheatsheetseries.owasp.org/cheatsheets/AI_Agent_Security_Cheat_Sheet.html — risk baseline for anti-features

## Quality Gate Checklist

- [x] Categories are clear (table stakes vs differentiators vs anti-features)
- [x] Complexity noted for each feature
- [x] Dependencies between features identified
- [x] MVP scope defined with clear P1 features
- [x] Anti-features documented with alternatives

---
*Feature research for: Multi-Agent Rule Enforcement System (Agent Forcefield)*
*Researched: 2026-03-04*