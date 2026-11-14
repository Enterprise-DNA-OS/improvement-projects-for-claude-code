---
description: Bring Minitab Engage project exports into the database
---

Read CLAUDE.md. Bring Minitab Engage project exports into the database.

Run:

```bash
npm run improvements -- import minitab-engage --file=projects.csv --source=engage-deployment --actor="Migration owner" --dry-run
```

Use the operator's actual identifiers, dates and evidence. The example values are not authority to create facts. Add --json for structured output. Read the affected record with show first for a change. Names are case-insensitive; an ambiguous name lists candidates and exits without changes. Use the exact code or ID after resolving the ambiguity.

Present the result in plain language with project codes, owners and what needs attention. Do not turn missing evidence into approval. Never send, publish or delete. Drafts stay in drafts/.

Read docs/replace-minitab-engage.md before importing. Review the dry-run counts, mapped columns and original export. Apply within the operator's authorised import by rerunning without --dry-run. No completed status, savings amount or approval is trusted from the file.
