# ROADMAP.md - Agent Forcefield

## Overview

**Project:** Agent Forcefield — Multi-Agent Rule Enforcement System
**MVP Scope:** 16 requirements across 4 phases
**Timeline:** 4 weeks

---

## Phase 1: Foundation & Error Collection

**Goal:** 建立基础设施，实现错误收集功能

**Requirements:**
- ERR-01: 工具调用失败检测
- ERR-02: 用户纠正检测
- ERR-03: 错误上下文收集
- ERR-04: 错误写入 `.learnings/ERRORS.md`
- ERR-05: CLI 手动添加错误
- INT-01: OpenClaw Plugin 加载
- INT-02: 复用 `.learnings/` 结构
- INT-03: CLI 命令入口

**Deliverables:**
- OpenClaw Plugin 骨架（`index.ts`）
- Hook: `tool_result_persist` 错误检测
- Hook: `agent_end` 用户纠正检测
- CLI 命令: `openclaw forcefield error add`
- 规则文件格式规范（Markdown + YAML frontmatter）
- `rules/` 目录结构

**Success Criteria:**
1. 工具调用失败时，错误自动写入 `.learnings/ERRORS.md`
2. 用户说"不对"/"错了"时，纠正被记录
3. `openclaw forcefield list` 显示已收集的错误
4. Plugin 正确加载，不报错

**Duration:** 1 week

---

## Phase 2: Rule Generation & Persistence

**Goal:** 实现自动规则生成和持久化

**Requirements:**
- RULE-01: 从 `.learnings/*.md` 提取错误模式
- RULE-02: 自动生成规则（LLM）
- RULE-03: CLI 手动创建规则
- RULE-04: 规则持久化到 `rules/*.md`
- RULE-05: `forcefield list` 查看规则
- RULE-06: `forcefield show <id>` 查看详情
- RULE-07: 规则生成通知

**Deliverables:**
- 规则生成器（LLM prompt + 解析）
- 规则存储层（`ruleStore.ts`）
- 规则解析器（`ruleParser.ts`）
- CLI 命令: `openclaw forcefield rule create`
- CLI 命令: `openclaw forcefield rule list`
- CLI 命令: `openclaw forcefield rule show <id>`
- 通知机制（日志 + 可选外部通知）

**Success Criteria:**
1. 运行 `forcefield synthesize` 后，从 `.learnings/` 生成规则
2. 生成的规则符合混合格式（Markdown + YAML）
3. 规则文件可读、可 diff
4. 用户收到规则生成通知

**Duration:** 1 week

---

## Phase 3: Closed-Loop Automation

**Goal:** 实现自动化闭环（错误 → 规则 → 合并）

**Requirements:**
- LOOP-01: Cron 定时任务触发规则生成
- LOOP-02: 重复错误检测（3+ 次）
- LOOP-03: 自动合并规则（通知 + 自动）

**Deliverables:**
- Cron 任务调度器
- 错误聚合器（相似错误分组）
- 重复检测器（递归计数）
- 自动合并逻辑
- 闭环监控指标

**Success Criteria:**
1. Cron 任务每小时运行，检查新错误
2. 同一错误出现 3+ 次时，自动触发规则生成
3. 生成的规则自动合并，用户收到通知
4. `forcefield status` 显示闭环健康状态

**Duration:** 1 week

---

## Phase 4: Integration & Validation

**Goal:** 集成测试，验证核心价值

**Requirements:**
- 所有 v1 requirements 验证通过

**Deliverables:**
- 集成测试套件
- E2E 测试（错误 → 规则流程）
- 文档（README + 使用指南）
- 性能基准

**Success Criteria:**
1. 错误重复率降低 50%+（对比 before/after）
2. 80%+ 的递归错误有对应规则
3. 规则生成准确率 > 70%
4. 用户干预减少 50%+

**Duration:** 1 week

---

## Phase Dependencies

```
Phase 1 (Foundation) → Phase 2 (Rule Gen) → Phase 3 (Automation) → Phase 4 (Validation)
```

- Phase 2 依赖 Phase 1 的错误收集数据
- Phase 3 依赖 Phase 2 的规则生成能力
- Phase 4 验证全部功能

---

## v2+ Roadmap (Post-MVP)

### Phase 5: Knowledge Injection (v2)
- INJ-01 ~ INJ-03: `before_prompt_build` 知识注入

### Phase 6: Rule Management (v2)
- RULE-08 ~ RULE-10: 置信度、版本、回滚

### Phase 7: Physical Interception (v3)
- GUARD-01 ~ GUARD-03: `before_tool_call` 拦截

### Phase 8: Multi-Agent & Advanced (v3)
- MULTI-01 ~ MULTI-02: 多 Agent 支持
- ADV-01 ~ ADV-03: 仪表盘、A/B 测试、导入导出

---

*Generated: 2026-03-04*
*Total v1 requirements: 16*
*Total phases: 4*