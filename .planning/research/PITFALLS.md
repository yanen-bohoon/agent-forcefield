# Pitfalls Research

**Domain:** Multi-Agent Rule Enforcement Systems
**Researched:** 2026-03-04
**Confidence:** MEDIUM (based on Anthropic documentation, MCP patterns, and long-running agent research; limited direct multi-agent enforcement literature exists)

## Critical Pitfalls

### Pitfall 1: Memory/Rule Amnesia

**What goes wrong:**
Agents start each session with no recollection of stored rules, previous violations, or learned corrections. Even when memory tools exist, agents often fail to query them before acting, leading to repeated violations of known rules.

**Why it happens:**
- LLMs have no persistent state between context windows
- Memory retrieval is not automatic; it requires explicit tool calls
- Agents prioritize immediate task completion over context restoration
- Memory tools are passive (read/write) not active enforcement mechanisms

**How to avoid:**
- Implement mandatory memory pre-check hooks that block agent actions until memory is retrieved
- Structure memory as active constraints, not passive reference material
- Use system prompts that enforce memory consultation as a hard gate
- Design "context recovery rituals" that must complete before any work begins

**Warning signs:**
- Agent repeats mistakes it was corrected on in previous sessions
- Memory files exist but are never read during sessions
- Rules are known but ignored in actual behavior
- User has to manually restate rules across sessions

**Phase to address:** Phase 1 (Core Infrastructure) - Memory retrieval must be foundational

---

### Pitfall 2: Context Rot in Long Sessions

**What goes wrong:**
As conversation context grows, model accuracy and recall degrade. Rules placed early in context become less influential. The agent "forgets" constraints that were clear at session start.

**Why it happens:**
- Models exhibit attention decay for tokens far from current focus
- Important rules get buried under accumulating conversation turns
- No mechanism to re-surface critical constraints mid-session
- Compaction/summarization can lose rule nuance

**How to avoid:**
- Implement rule injection at strategic points (not just at start)
- Use priority markers for rules that must stay in active context
- Design "rule refresh" triggers that re-inject constraints when context grows
- Consider separate rule context that's protected from compaction

**Warning signs:**
- Rule compliance starts strong but degrades over session length
- Violations correlate with context token count
- Agent seems to "forget" rules mentioned 20+ turns ago
- Compaction summaries lose rule details

**Phase to address:** Phase 1-2 (Context Management System)

---

### Pitfall 3: Premature Victory Declaration

**What goes wrong:**
Agents declare tasks complete (including rule compliance) without proper verification. "I've followed the rules" is stated but not demonstrated. Features are marked done that don't actually work.

**Why it happens:**
- Models optimize for task completion signals
- No objective verification mechanism exists
- Self-assessment is unreliable (models can't see their own blind spots)
- Enforcement is passive logging, not active blocking

**How to avoid:**
- Require explicit evidence for compliance claims
- Implement automated verification hooks that test rule adherence
- Use evaluator-optimizer patterns where a separate agent validates
- Create checklists that must pass before task can be marked complete
- Never trust self-declaration; always verify externally

**Warning signs:**
- Agent says "done" but violations are found on inspection
- No test output or evidence accompanying completion claims
- User has to manually verify every "completed" task
- Repeat violations in subsequent sessions reveal earlier non-compliance

**Phase to address:** Phase 2 (Enforcement Engine) with Phase 4 (Verification Layer)

---

### Pitfall 4: Rule Erosion Through Summarization

**What goes wrong:**
When context compaction occurs, nuanced rules get simplified to generic summaries. Important exceptions and edge cases are lost. The "compacted" version of rules is weaker than original.

**Why it happens:**
- Summarization prioritizes task progress over constraint preservation
- Rule subtlety doesn't survive compression
- Compaction is typically task-focused, not rule-focused
- No special handling for enforcement-critical content

**How to avoid:**
- Mark rules as "compaction-protected" content
- Implement rule-specific summarization that preserves exceptions
- Store canonical rules externally and re-inject after compaction
- Test compaction outputs for rule fidelity, not just task fidelity

**Warning signs:**
- Rules work early in session but become vague after compaction
- Exceptions that were clear initially disappear from agent behavior
- Post-compaction behavior violates rules that pre-compaction agent followed

**Phase to address:** Phase 2 (Context Management)

---

### Pitfall 5: Multi-Agent Coordination Chaos

**What goes wrong:**
When multiple agents operate in parallel or sequence, they can conflict with each other, duplicate work, or leave the system in inconsistent states. One agent's changes break another's assumptions.

**Why it happens:**
- No shared state or coordination protocol between agents
- Each agent optimizes for its own task, not system-wide rules
- Orchestrator doesn't enforce cross-agent constraints
- Race conditions in parallel execution

**How to avoid:**
- Implement shared state with atomic updates
- Design orchestrator that enforces cross-agent rules
- Use locking/coordination for shared resources
- Create agent-to-agent communication channels for coordination
- Design rollback mechanisms when conflicts detected

**Warning signs:**
- Error rates increase with number of concurrent agents
- Changes from one agent break another agent's work
- Inconsistent state after parallel agent runs
- Manual intervention required to resolve agent conflicts

**Phase to address:** Phase 3 (Multi-Agent Orchestration)

---

### Pitfall 6: Passive Enforcement (Logging Without Action)

**What goes wrong:**
The system detects and logs violations but takes no corrective action. A "self-improving agent" that only records mistakes without enforcing rules. Violations pile up without prevention.

**Why it happens:**
- Logging is easier than intervention
- Fear of blocking legitimate work with false positives
- No clear policy for what action to take on violations
- Designed as observability, not enforcement

**How to avoid:**
- Define enforcement actions for each rule type (warn, block, correct, escalate)
- Implement graduated response (first violation = warn, repeat = block)
- Create feedback loops that update rules based on violation patterns
- Design intervention points where enforcement can inject

**Warning signs:**
- Logs show repeated violations of same rules
- "Self-improving" system never actually improves behavior
- Users must manually intervene after each logged violation
- Violation count grows but behavior doesn't change

**Phase to address:** Phase 2 (Enforcement Engine) - This is the core differentiator

---

### Pitfall 7: One-Shotting Instead of Incremental Enforcement

**What goes wrong:**
Agent attempts to enforce all rules simultaneously in one pass, leading to incomplete enforcement and context exhaustion. Complex enforcement requires multiple targeted interventions.

**Why it happens:**
- Models tend toward single-turn optimization
- No structured enforcement workflow
- Rules are presented as bulk list rather than prioritized phases
- "Fix everything at once" mindset

**How to avoid:**
- Design incremental enforcement workflow with phases
- Prioritize rules by risk/severity
- Allow agent to focus on one rule category at a time
- Create checkpoints between enforcement phases
- Design state persistence for multi-session enforcement

**Warning signs:**
- Enforcement attempts are shallow across many rules
- High-priority rules get same attention as low-priority
- Context exhausted mid-enforcement
- Incomplete enforcement with no resumption strategy

**Phase to address:** Phase 3 (Orchestration)

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Store rules in prompt only | Simple implementation | Rules lost on context reset, no persistence | Never for enforcement system |
| Log violations without action | Fast to implement | No actual enforcement, user must intervene manually | Prototype only |
| Single agent for all enforcement | Simplicity | Doesn't scale, single point of failure | MVP with < 3 rule types |
| Hard-coded rule checks | Fast, deterministic | Inflexible, can't adapt to new rules | Never (design for extensibility) |
| Skip verification step | Faster completion | Premature victory, undetected violations | Never |
| No rollback mechanism | Simpler state | Can't recover from bad enforcement action | Never for production |

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Memory Tool | Assume agent will automatically read memory | Enforce memory read as blocking pre-condition |
| Context Compaction | Let compaction summarize rules | Protect rules from compaction, re-inject after |
| MCP Tools | Assume tools enforce rules | Tools are capabilities, not constraints; enforcement must wrap tools |
| Agent Spawning | Spawn without rule inheritance | Each spawned agent must inherit and acknowledge parent rules |
| State Storage | Use conversation history as state | Extract and persist state explicitly to external store |
| Orchestrator | Let orchestrator only route | Orchestrator must enforce cross-agent rules |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Linear rule checking | O(n) enforcement latency | Rule indexing, priority queues | > 50 rules |
| Context-per-rule | Context explosion with rules | Hierarchical rules, lazy loading | > 20 rules in context |
| Single enforcement point | Bottleneck at enforcement layer | Parallel enforcement for independent rules | > 5 concurrent agents |
| No enforcement caching | Re-checking same conditions | Cache rule evaluation results | > 10 similar operations |
| Verbose rule logging | Token burn, context pollution | Summarize logs, sample logging | High-frequency operations |

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Rule injection via user input | User can override system rules | Sanitize all rule content, use allowlists |
| Agent privilege escalation | Agent grants itself exemptions | Hard constraints that agents cannot modify |
| Rule tampering in transit | Rules modified before enforcement | Cryptographic signing of rule payloads |
| Memory tool path traversal | Access to files outside memory directory | Validate all paths, use sandbox |
| Cross-agent rule leakage | Agent A's rules affect Agent B | Strict rule namespacing per agent/session |

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Silent enforcement | User doesn't know why actions blocked | Provide clear enforcement explanations |
| No override mechanism | User stuck when enforcement wrong | Allow temporary override with audit trail |
| Over-enforcement | Legitimate work blocked by overzealous rules | Confidence thresholds, require evidence |
| No visibility into rules | User can't understand enforcement decisions | Expose active rules and their states |
| Enforcement spam | Too many warnings, user ignores all | Group notifications, severity levels |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Memory Integration:** Often missing automatic memory retrieval before agent actions — verify memory read happens on every session start
- [ ] **Rule Verification:** Often missing external verification — verify compliance is tested, not just declared
- [ ] **Context Recovery:** Often missing state recovery for new sessions — verify agent can resume from previous session state
- [ ] **Multi-Agent Coordination:** Often missing cross-agent communication — verify agents coordinate, not just coexist
- [ ] **Enforcement Action:** Often missing corrective action — verify violations trigger response, not just logging
- [ ] **Rollback:** Often missing rollback capability — verify system can recover from enforcement errors
- [ ] **Rule Persistence:** Often missing rule versioning — verify rule changes are tracked and revertible

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Memory Amnesia | MEDIUM | Re-inject rules from external store, re-run verification |
| Context Rot | HIGH | Force context reset, reload rules, may lose session progress |
| Premature Victory | MEDIUM | Re-run verification suite, fix any gaps |
| Rule Erosion | HIGH | Restore canonical rules from versioned store, re-train context |
| Multi-Agent Chaos | HIGH | Halt all agents, resolve conflicts, may need state rollback |
| Passive Enforcement | MEDIUM | Enable enforcement actions, re-run on recent violations |
| One-Shotting | LOW | Continue enforcement in next phase/session |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Memory/Rule Amnesia | Phase 1 (Core Infrastructure) | Test: Agent starts new session and correctly retrieves rules |
| Context Rot | Phase 2 (Context Management) | Test: 100-turn session maintains rule compliance |
| Premature Victory | Phase 4 (Verification Layer) | Test: "Done" claim triggers automated compliance check |
| Rule Erosion | Phase 2 (Context Management) | Test: Post-compaction agent still follows nuanced rules |
| Multi-Agent Chaos | Phase 3 (Orchestration) | Test: 3+ concurrent agents don't conflict |
| Passive Enforcement | Phase 2 (Enforcement Engine) | Test: Violation triggers action, not just log |
| One-Shotting | Phase 3 (Orchestration) | Test: Enforcement completes across multiple phases |

## Sources

- **Anthropic "Building Effective AI Agents"** - Workflow patterns, agent principles, evaluator-optimizer pattern
- **Anthropic "Effective Harnesses for Long-Running Agents"** - Memory patterns, context recovery rituals, incremental progress
- **Anthropic "Context Windows" documentation** - Context rot, compaction behavior, token management
- **Anthropic "Memory Tool" documentation** - Just-in-time context retrieval, multi-session patterns
- **Model Context Protocol specification** - Tool design, resource patterns, coordination primitives
- **User-identified challenges** - Memory ignorance, context decay, error rate scaling, manual intervention burden
- **Existing self-improving-agent** - Reference for passive logging pattern to avoid

---
*Pitfalls research for: Multi-Agent Rule Enforcement System (Agent Forcefield)*
*Researched: 2026-03-04*