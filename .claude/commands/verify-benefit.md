---
description: Record a separate reviewer and supporting evidence
---

Read CLAUDE.md. Record a separate reviewer and supporting evidence.

Run:

```bash
npm run improvements -- verify-benefit --ref="Reduced overtime" --evidence="Finance reconciliation" --actor="Separate reviewer"
```

Use the operator's actual identifiers, dates and evidence. The example values are not authority to create facts. Add --json for structured output. Read the affected record with show first for a change. Names are case-insensitive; an ambiguous name lists candidates and exits without changes. Use the exact code or ID after resolving the ambiguity.

Present the result in plain language with project codes, owners and what needs attention. Do not turn missing evidence into approval. Never send, publish or delete. Drafts stay in drafts/.

The reviewer must differ from the person who recorded the benefit. Use only a review actually supplied by a person. This records their review; it does not audit their accounts.
