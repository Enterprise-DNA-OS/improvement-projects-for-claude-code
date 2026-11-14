---
description: Record a human phase review after the evidence checks pass
---

Read CLAUDE.md. Record a human phase review after the evidence checks pass.

Run:

```bash
npm run improvements -- review-phase --ref=IMP-101 --phase=define --evidence="Human review reference" --actor="Reviewer name"
```

Use the operator's actual identifiers, dates and evidence. The example values are not authority to create facts. Add --json for structured output. Read the affected record with show first for a change. Names are case-insensitive; an ambiguous name lists candidates and exits without changes. Use the exact code or ID after resolving the ambiguity.

Present the result in plain language with project codes, owners and what needs attention. Do not turn missing evidence into approval. Never send, publish or delete. Drafts stay in drafts/.

The phase order is define, measure, analyze, improve, control. The checks enforce current earlier reviews, baseline measures, observations and closure evidence. Explain a failure and repair the missing record with the operator; never bypass it. An actor string records the operator, it is not an authenticated identity.
