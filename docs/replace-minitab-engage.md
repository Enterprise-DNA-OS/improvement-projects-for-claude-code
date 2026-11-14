# Move project records from Minitab Engage

Export the project column set you need from the Engage dashboard. Minitab documents this at [Choose and export column sets](https://support.minitab.com/en-us/engage/help-and-how-to/dashboard/column-sets/choose-and-export-column-sets/). Filters affect the exported set. Data table categories are separate files. The [Workflow export](https://support.minitab.com/en-us/engage/help-and-how-to/workflow/basics/export-data-from-the-workflow-page/) downloads a ZIP with collapsed and expanded CSV views for the selected stage. Extract it and choose one project row per project, not an expanded child-data export.

Start with a new database and run npm run migrate. Do not seed your working database.

```bash
npm run improvements -- import minitab-engage --file=projects.csv --source=my-engage-deployment --actor="Migration owner" --dry-run
npm run improvements -- import minitab-engage --file=projects.csv --source=my-engage-deployment --actor="Migration owner"
```

The second command is the one-command project import. Export preparation and reconciliation still need a person.

| Export column | Record |
|---|---|
| Project ID or ID | External key within the named source; Project Name is the fallback |
| Project Name or Name | Title |
| Project Leader or Owner | Owner |
| Sponsor or Project Sponsor | Sponsor |
| Problem Statement, Goal Statement, Process | Project brief |
| Due Date, Completion Date or Completion | Due date; use a planned due-date column, not actual completion |
| Current Phase or Phase | Define, Measure, Analyze, Improve or Control; Analyse accepted |
| Other columns | Original source_data, preserved verbatim |

Column sets are configurable, so no universal export header is promised. Our fixture is synthetic, follows documented column-set concepts, and is not a downloaded customer export. Use --map=fixtures/field-map.json for renamed fields. Mapping keys are external_id, title, owner, sponsor, problem, goal, process, due_on, phase. Map only columns present in the export. Dates default to ISO YYYY-MM-DD. Add --date-format=dmy for DD/MM/YYYY; ambiguous dates are rejected otherwise. Map the due date explicitly when your Completion field means an actual finish date.

Each source and external key pair identifies one project. Keep --source stable. If no stable Project ID is present, renaming a project creates another key; use a durable mapped identifier before production import. Duplicate keys in one file fail the entire transaction. Repeating identical data makes no changes. Changed data requires --update and invalidates old project reviews. Existing local phases are retained on updates; the exported phase remains in source_data for reconciliation. New imported projects start as ideas pending local review, even if Engage says completed. No review or saving is invented from an imported status or amount.

The importer brings across project fields. It does not import nested task files, benefit schedules, attachments, diagrams, simulations, sign-off identities, or the proprietary project file. Keep original exports and separately reconcile those records. Enterprise DNA maps those additional records as part of the agreed migration. Run list, show, phase-queue and export, compare row counts and original columns, and have the owner sign off before switching systems.

JSON export contains every collection, including source rows, reviews, voided benefits and import hashes. CSV exports are spreadsheet-safe: leading formula characters are prefixed with an apostrophe. Use JSON when exact string preservation matters. Exports are backups of records, not automatic restore files; restore through a reviewed migration and reconcile counts.
