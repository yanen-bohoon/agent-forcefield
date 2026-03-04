# PROJECT.md - Agent Forcefield

## What This Is

**Agent Forcefield** —— 一个 OpenClaw Plugin，解决 Multi-Agent 系统的死结：**明明给 Agent 存了记忆、写了规则，它还是会重复犯错。**

核心洞见：
> "存储不等于使用，建议不等于强制"

## The Problem

Multi-Agent 系统的三个结构性死结：

| 死结 | 说明 |
|------|------|
| **主动权缺失** | Agent 搜不搜 RAG 全靠 LLM 判断，导致知识链条断裂 |
| **上下文衰减** | Session 越长，早期规则权重越低，规则变成"建议"而非"铁律" |
| **规模摩擦** | 多 Agent 协作时，错误率呈指数级爆炸，人工救场成本不可承受 |

## The Solution

三个核心技术方案：

| 方案 | Hook 层级 | 作用 |
|------|----------|------|
| **按需定点投喂** | `before_prompt_build` | 根据任务阶段强制注入 Prompt，让知识"喂到嘴边" |
| **物理拦截执行** | `before_tool_call` | 拦截 Agent 输出，将概率性错误物理修正为确定性正确 |
| **自动化闭环** | Cron 定时任务 | 清洗错误日志 → 自动生成规则 → Merge 到共享库 |

**MVP 范围**：优先实现**自动闭环流程**

## Core Value

> Multi-Agent 系统的网络效应，不应建立在人工维护的基础上，而应建立在**"越跑越稳、自动迭代"**的闭环上。

**"今日 Bug，明日补丁"**

## How It Works (MVP)

### 1. 错误收集层

| 来源 | 实现方式 | 优先级 |
|------|---------|-------|
| 用户纠正 | 检测 "不对"、"应该是"、"错了" 等关键词 | P0 |
| 工具调用失败 | `tool_result_persist` Hook 捕获异常 | P1 |
| self-improving-agent | 复用现有 `.learnings/*.md` | 集成 |
| 手动标注 | CLI/API 手动添加错误 | 支持 |

### 2. 规则生成层

- 读取 `.learnings/*.md` + `patches/*.md` 作为训练数据
- LLM 总结为可执行规则
- 写入 `workspace/rules/*.md`

### 3. 规则格式（混合）

```markdown
# RULE-20260304-001: 禁止在 GSD 中直接 sessions_spawn 编码

**来源**: ERR-20260304-003
**触发条件**: 任务涉及 coding + GSD 流程
**规则**: 必须通过 `/gsd execute-phase N` 调用 coder-swarm
**强制级别**: hard（物理拦截）
```

### 4. 知识注入层（Phase 2）

- `before_prompt_build` Hook
- 根据任务阶段注入相关规则
- 格式：自然语言片段，注入到 `prependContext`

### 5. 物理拦截层（Phase 3）

- `before_tool_call` Hook
- 根据规则检查工具参数
- 违规则修正或拒绝

### 6. Merge 行为

- **通知 + 自动合并**：发通知给用户，但默认自动合并
- 不阻塞流程，用户可随时查看/回滚

## Constraints

1. **独立服务**：作为 OpenClaw Plugin，不改 OpenClaw 源码，更新不受影响
2. **兼容现有系统**：复用 self-improving-agent 的 `.learnings/` 结构
3. **渐进式增强**：MVP 先做闭环，后续再做注入/拦截

## Success Metrics

| 指标 | 目标 |
|------|------|
| 错误重复率 | 降低 50%+ |
| 规则覆盖率 | 80%+ 的已知错误有对应规则 |
| 人工干预 | 减少 70%+ 的手动修复 |

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| 独立 `rules/` 目录 | 不污染现有文件，便于管理 | — Pending |
| 混合规则格式 | 人可读 + 机器可执行 | — Pending |
| 通知 + 自动合并 | 不阻塞流程，用户可见 | — Pending |
| MVP 聚焦闭环 | 验证核心价值，再扩展 | — Pending |

## Target User

- Yanen（主要用户）
- OpenClaw 用户（未来）

## Technical Stack

- OpenClaw Plugin API
- TypeScript/Node.js
- OpenClaw Hooks: `before_prompt_build`, `before_tool_call`, `tool_result_persist`, `agent_end`
- Cron 定时任务（OpenClaw 内置）

---
*Last updated: 2026-03-04 after initialization*