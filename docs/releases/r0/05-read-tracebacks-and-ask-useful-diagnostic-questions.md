---
id: r0-05
title: "Read a traceback"
release: r0
order: 5
prerequisites: [r0-04]
outcomes:
  - Reproduce AttributeError for gold_pasal.release and copy the final exception line
  - Separate a healthy import from a broken attribute name
  - Write five diagnostic questions a CI failure can actually answer
evidence: [commit, ci-run]
---

<LessonMission
  role="new backend engineer"
  problem="A missing name on gold_pasal looks like 'Python is broken' until you read the last line of the traceback."
  destination="You can copy the exception type, the missing name, and the command that reproduced it."
/>

# Read a traceback

Work in `gold-pasal`. The package has `__version__`, not `release`. Do not edit the starter.

## See the idea first

```bash
uv run python -c "import gold_pasal; print(gold_pasal.release)"
```

Non-zero exit. The traceback ends like this:

```text
Traceback (most recent call last):
  File "<string>", line 1, in <module>
AttributeError: module 'gold_pasal' has no attribute 'release'
```

A **traceback** is Python's list of the active call path when something went wrong. The final line is the exception type and message. Because the source was `python -c`, the file name is `<string>`.

**AttributeError** means the object has no attribute with that name. Import already succeeded. If import had failed, you would see `ModuleNotFoundError` first.

The bench cannot import `gold_pasal`. It raises the same exception type on a string:

<PythonRunner
  label="Ask an object for a name it does not have"
  code="version = '0.1.0'
print(version.release)"
/>

## Copy five facts

From the command you just ran:

1. The command is the reproduction step.
2. The exception type is `AttributeError`.
3. The message says the module lacks `release`.
4. The failing expression is `gold_pasal.release`.
5. The smallest question is “Which public version attribute actually exists?”

That name is `__version__`. Do not add a `release` alias to silence the error.

<LessonQuiz
  question="If import succeeds but attribute lookup fails, which boundary is healthy and which is broken?"
  a="The environment is broken; reinstall with uv sync"
  b="Import and the project environment are healthy; the name release is missing"
  c="Both import and the attribute are broken"
  d="Add a release alias to silence the error"
  correct="b"
>

Import and the project environment are healthy. The name `release` does not exist. Repair by using `__version__`.

</LessonQuiz>

## Questions CI can actually answer

When a hosted run fails, answer:

- What exact command reproduced it?
- What is the final exception type and message?
- What is the first project-owned frame nearest the bottom?
- What actual value or name appeared, and what was expected?
- Did the same commit pass the narrower check locally?

Avoid “Why is Python broken?” Prefer “Why does `gold_pasal.release` fail while `gold_pasal.__version__` succeeds?”

## Practice

```bash
uv run python -c "import gold_pasal; print(gold_pasal.__version__)"
```

Expected: `0.1.0` and exit status `0`. Then:

```bash
./scripts/verify.sh
```

Next: [Small commits](06-work-in-small-commits-and-recover-without-destructive-git).

<EvidenceCard
  command="./scripts/verify.sh"
  artifact="copied AttributeError line, the reproducing command, and a green verify afterward"
  invariant="a missing attribute is not a missing Python install"
/>
