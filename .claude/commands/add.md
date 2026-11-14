---
description: Add a project, action, metric, benefit or control
---

Read CLAUDE.md. Add a project, action, metric, benefit or control.

Run:

```bash
npm run improvements -- add --kind=project --code=IMP-105 --title="Reduce loading delay" --owner="Morgan Hale" --actor="Operator name"
```

Use the operator's actual identifiers, dates and evidence. The example values are not authority to create facts. Add --json for structured output. Read the affected record with show first for a change. Names are case-insensitive; an ambiguous name lists candidates and exits without changes. Use the exact code or ID after resolving the ambiguity.

Present the result in plain language with project codes, owners and what needs attention. Do not turn missing evidence into approval. Never send, publish or delete. Drafts stay in drafts/.
