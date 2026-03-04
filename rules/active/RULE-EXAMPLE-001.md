---
id: RULE-EXAMPLE-001
title: Validate tool params before execution
status: active
priority: high
enforcement: soft
trigger:
  tools:
    - bash
    - exec_command
  keywords:
    - failed
    - error
  context:
    - forcefield
createdAt: 2026-03-04
sourceErrors:
  - ERR-20260304-001
---

# Validate Tool Params Before Execution

## Rule
Before running a tool command, validate required parameters and expected preconditions.

## Why
Missing or malformed parameters are a frequent source of preventable failures.

## Expected Action
1. Verify command syntax and required arguments.
2. Confirm relevant files/paths exist.
3. Run the tool only after validation passes.
