---
id: r11-03
title: "Budgets and allowlists"
release: r11
order: 3
prerequisites: [r11-02]
outcomes:
  - Enforce an allowlist of tool names
  - Stop a run at max steps or deadline
evidence: [commit, ci-run]
---

<LessonMission
  role="staff assistant operator"
  problem="The model calls search 40 times and then tries a shell tool you never defined."
  destination="Allowlisted tool names, max steps, a deadline, and a max output size, all in the harness."
/>

# Budgets and allowlists

The **harness** is your loop code, not the model. If the model emits `run_shell`, you reject it before any call. **Step budget** counts observe-decide-act turns. **Deadline** is wall clock. Truncate tool results over a size limit and store the rest on disk.

## See the idea first

From `gold-pasal`:

```bash
rg max_steps src/gold_pasal/agent || echo 'not yet'
```

```text
not yet
```

Add AgentLimits(max_steps=8, deadline_s=30, max_tool_bytes=8000).

## Loop

```python
for step in range(limits.max_steps):
    if time.monotonic() > deadline:
        return Run(status="deadline")
    action = parse(model_output)
    if action.tool not in ALLOWED:
        return Run(status="rejected_tool")
    result = await tools.run(action)
```

Tests: fake model requests `bash`; expect rejected_tool and zero HTTP. Fake model loops search; expect stop at max_steps.

Output limits: if catalog search returns 100 rows, cut to N and say so in the tool result.

## Why eight steps

Search, maybe search again with a tighter karat, preview hold, then stop. That is fewer than eight. A loop of forty searches is a bug or a prompt injection, not a legitimate staff task. If a real task needs more, you raise `max_steps` in Settings and record why in an ADR, not in the prompt.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| bash ran | allowlist in the prompt only | Enforce in code |
| loop of 100 | no max_steps | Cap it |

## Practice

<LessonQuiz
  question="Who rejects an unknown tool name?"
  a="The model, hopefully"
  b="The harness, before execution"
  c="Postgres"
  d="kind"
  correct="b"
>

Prompts are not a security boundary.

</LessonQuiz>

Next: [Confirm before inventory writes](04-confirm-before-inventory-writes).

<EvidenceCard
  command="uv run pytest tests/agent/test_limits.py -q"
  artifact="AgentLimits and rejected_tool test"
  invariant="Stop conditions are code."
/>
