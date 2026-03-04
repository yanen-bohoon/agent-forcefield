# REQUIREMENTS.md - Agent Forcefield

## v1 Requirements (MVP)

### Error Collection & Detection

- [ ] **ERR-01**: 系统能检测工具调用失败（`tool_result_persist` Hook 捕获异常）
- [ ] **ERR-02**: 系统能检测用户纠正（关键词："不对"、"错了"、"应该是"、"No"）
- [ ] **ERR-03**: 系统能收集错误上下文（session key、时间戳、输入参数、错误输出）
- [ ] **ERR-04**: 系统能将错误写入 `.learnings/ERRORS.md`（复用 self-improving-agent 格式）
- [ ] **ERR-05**: 用户能通过 CLI 手动添加错误记录

### Rule Generation

- [ ] **RULE-01**: 系统能从 `.learnings/*.md` 提取错误模式（LLM 分析）
- [ ] **RULE-02**: 系统能自动生成规则（混合格式：Markdown + YAML frontmatter）
- [ ] **RULE-03**: 用户能通过 CLI 手动创建规则
- [ ] **RULE-04**: 系统能持久化规则到 `rules/*.md` 目录
- [ ] **RULE-05**: 用户能查看规则列表（`forcefield list` 命令）
- [ ] **RULE-06**: 用户能查看单条规则详情（`forcefield show <id>` 命令）
- [ ] **RULE-07**: 规则生成时发送通知给用户

### Closed-Loop Automation

- [ ] **LOOP-01**: 系统能通过 Cron 定时任务触发规则生成
- [ ] **LOOP-02**: 系统能检测重复错误（同一错误出现 3+ 次）
- [ ] **LOOP-03**: 系统能自动合并生成的规则（通知 + 自动）

### Integration

- [ ] **INT-01**: 作为 OpenClaw Plugin 加载
- [ ] **INT-02**: 复用现有 `.learnings/` 目录结构
- [ ] **INT-03**: 提供 CLI 命令入口（`openclaw forcefield`）

---

## v2 Requirements (Deferred)

### Knowledge Injection

- [ ] **INJ-01**: `before_prompt_build` Hook 根据任务阶段注入相关规则
- [ ] **INJ-02**: 规则匹配器（根据触发条件筛选适用规则）
- [ ] **INJ-03**: Prompt 注入器（将规则注入到 `prependContext`）

### Rule Management

- [ ] **RULE-08**: 规则置信度评分
- [ ] **RULE-09**: 规则版本控制
- [ ] **RULE-10**: 规则回滚

### Multi-Agent

- [ ] **MULTI-01**: 多 Agent 规则共享
- [ ] **MULTI-02**: 规则命名空间隔离

---

## v3 Requirements (Future)

### Physical Interception

- [ ] **GUARD-01**: `before_tool_call` Hook 拦截工具调用
- [ ] **GUARD-02**: 根据规则验证工具参数
- [ ] **GUARD-03**: 执行强制动作（allow/deny/transform）

### Advanced

- [ ] **ADV-01**: 规则分析仪表盘
- [ ] **ADV-02**: A/B 测试规则版本
- [ ] **ADV-03**: 跨项目规则导入/导出

---

## Out of Scope

| Exclusion | Reason |
|-----------|--------|
| Block All Unknown Actions | Too restrictive, causes agent paralysis |
| Learn from Every Error | Noise pollution, low signal |
| Real-Time Rule Sync | Race conditions, debugging nightmare |
| Natural Language Rules Only | Ambiguous, hard to enforce |
| External Cloud Services | Local-first, zero-dependency principle |

---

## Traceability

| REQ-ID | Phase | Status |
|--------|-------|--------|
| ERR-01 ~ ERR-05 | Phase 1 | Pending |
| RULE-01 ~ RULE-07 | Phase 2 | Pending |
| LOOP-01 ~ LOOP-03 | Phase 2 | Pending |
| INT-01 ~ INT-03 | Phase 1 | Pending |

---

*Last updated: 2026-03-04*