# Improvement Projects for Claude Code

Know which process changes worked, which savings have evidence, and which controls slipped.

| Do it yourself | We customise it | We run it for you |
|---|---|---|
| Free, MIT. Install the database and command recipes. | Your fields, review rules and agreed Minitab Engage records brought across. [Get your version built](https://enterprisedna.co/omni/book/?offer=replace-software&utm_source=github&utm_medium=readme&utm_campaign=minitab-engage). | Installed, connected and operated through Omni by Enterprise DNA. One setup fee, then a retainer. [Book a call](https://enterprisedna.co/omni/book/?offer=replace-software&utm_source=github&utm_medium=readme&utm_campaign=minitab-engage). |

For manufacturers and operations teams running continuous-improvement projects. Keep the problem, baseline, countermeasures, phase decisions, benefit evidence and follow-up checks together. The database is the product; Claude Code, Codex, OpenCode or Cursor is the door. Read AGENTS.md for the shared instructions.

Minitab Engage's current buying page directs buyers to sales. A historical vendor-hosted US government schedule gives a five-figure annual scenario for a small team; this is not a verified NZ/AU customer bill or a current commercial quote. [Selection evidence](docs/research.md) explains the source and limits.

## Quick start

```bash
git clone https://github.com/Enterprise-DNA-OS/improvement-projects-for-claude-code.git
cd improvement-projects-for-claude-code
npm install
npm run demo
npm run improvements -- attention
npm run view
npm run docs
```

Node 20 or newer. PGlite runs locally in .data/db without a separate database install. Demo data is fictional. For working data, use a separate DATA_DIR, run migrate and import, and do not run seed. DATABASE_URL selects PostgreSQL 15 or newer; use an operator role with appropriate privileges. The schema enables row security without public access policies. This is a trusted-operator system, not a tenant-facing service. Test backups and configure access before sharing it.

## The recurring jobs

| Command | Result |
|---|---|
| /portfolio | Read the project portfolio and open evidence counts |
| /phase-queue | Find project phases needing current review |
| /attention | Find overdue work, evidence gaps and failed checks |
| /benefits | Separate hard and soft benefits by currency and review state |
| /benefit-review | Read the benefit entries awaiting finance review |
| /measures | Compare each baseline, latest observation and target |
| /sustain-due | Read failed and due follow-up controls |
| /owner-load | Count active projects and overdue actions by owner |
| /stale-projects | Find projects without a review in 30 days |
| /compliance | Check recorded evidence and personal-information retention dates |
| /activity | Read the ordered change and note history |
| /help | List commands and accepted options |
| /list | Read one collection of records |
| /show | Read a project or another named record |
| /weekly-review | Prepare the Monday review from portfolio, attention and benefits |
| /add | Add a project, action, metric, benefit or control |
| /update | Change project, action or control fields |
| /log | Record a review note against a project |
| /record-measure | Record an observation with date and evidence |
| /review-phase | Record a human phase review after the evidence checks pass |
| /verify-benefit | Record a separate reviewer and supporting evidence |
| /void-benefit | Exclude an incorrect benefit while retaining its evidence |
| /record-check | Record a pass or failure for a follow-up control |
| /import | Bring Minitab Engage project exports into the database |
| /export | Write a complete JSON export or a spreadsheet-safe CSV |
| /draft-a3 | Draft an A3 review from current records |
| /draft-benefits | Draft the list of benefit claims needing review |
| /docs | Render the A3 and benefit paperwork |
| /view | Render the week, benefits and sustain reports |
| /customise | Change fields and rules through a tested migration |
| /new-view | Add a read-only report in the business's words |

All 27 CLI commands support --json. Write operations require --actor. Options use --key=value. Read help for options, and the matching .claude/commands file for the operating recipe. Ambiguous names fail and list candidates. Use an exact ID when records share a name.

## Evidence before completion

Define, measure, analyze, improve and control reviews are recorded with a person and evidence reference. Review the problem, owner, sponsor and goal first. Measurement review needs a baseline. Improve review needs observations. Completion needs current earlier reviews, all measures at target, closed actions, current passing follow-up checks and reviewed benefits.

Changing the project brief or adding a new metric invalidates earlier phase and benefit reviews. A completed project reopens after its brief changes. New failed checks and off-target observations stay visible even after closure. A note refreshes the review date but never approves a phase. Verified benefits mean a separate named person recorded their review of that project revision, not that the software independently audited a saving. Hard and soft benefits and different currencies are never combined. Void a mistaken benefit with a reason and enter its correction separately; the original remains in history and exports.

## Ten questions to ask

These are checks the CLI answers today, not claims that Engage cannot be configured to report the same data.

1. Which projects combine overdue actions and unreviewed benefits? Use /portfolio.
2. Which phase reviews refer to the current project brief? Use /phase-queue.
3. Which claimed savings still need a separate finance review? Use /benefit-review.
4. How much is verified, by currency and by hard or soft benefit? Use /benefits.
5. Which measures still miss their targets after a trial? Use /measures.
6. Which completed improvements have a failed follow-up check? Use /sustain-due.
7. Which owner has overdue actions across several projects? Use /owner-load.
8. Which projects have not had a review for 30 days? Use /stale-projects.
9. Which projects containing personal information need a retention review? Use /compliance.
10. Who changed a project and what evidence did they record? Use /activity.

## Your first hour: ten things to ask for

1. Set our business name and colours in brand.json.
2. Show the overdue actions and their owners.
3. Explain why the carton waste project needs another check.
4. Compare the latest changeover measure with its target.
5. Separate proposed savings from reviewed savings.
6. Show the phase evidence we still need.
7. Draft an A3 for the filling line project.
8. Preview the mapping of our Engage project export.
9. Add our site code to each project with /customise.
10. Create a report for the Monday operations meeting with /new-view.

## Bring the Engage projects across

```bash
npm run improvements -- import minitab-engage --file=projects.csv --source=our-deployment --actor="Migration owner" --dry-run
npm run improvements -- import minitab-engage --file=projects.csv --source=our-deployment --actor="Migration owner"
```

Use the documented project column-set CSV export, or extract the collapsed project CSV from the Workflow ZIP. Configured column names can be mapped. Project fields import in one command; diagrams, attachments, nested tasks and benefit schedules need separate mapping. New imported projects await local review. [Full switching guide](docs/replace-minitab-engage.md).

## Documents and reports

Edit brand.json once. npm run docs writes an A3 and benefit register for each project into docs-out/. npm run view writes week, benefit and sustain reports into views/. These are read-only HTML files you can print to PDF. /draft-a3 and /draft-benefits write internal drafts and never send them. /new-view adds another report from the same database.

## Checks and limits

[Compliance sources](docs/compliance.md) distinguish the DMAIC method, local evidence policy and the NZ personal-information retention prompt. Missing evidence is a finding, never a fabricated pass. Actor names and evidence references are operator-supplied. Database administrators can alter history. A hosted version needs real identity and role controls. [Why no front end](docs/why-no-front-end.md) explains the boundary with Engage's visual tools and team interface.

## Validation

npm test creates temporary data, migrates, seeds twice, exercises all CLI commands and checks import rollback, repeat imports, mappings, dates, phase gates, stale reviews, independent benefit review, separate currencies, exports, drafts and escaped HTML. The manual GitHub workflow defines Node 20 and 22 on Windows and Linux, plus PostgreSQL 17. TEST_DATABASE_URL must be a disposable empty database; it is never read from a working DATABASE_URL.

## Make it yours

/customise writes and tests a new migration and updates imports, commands and documents. Enterprise DNA builds the agreed web front end, data connections or different stack into your version. Omni by Enterprise DNA installs and runs it for one setup fee, then a retainer. Hosting and agent usage have their own costs. [Spend 30 minutes with Sam](https://enterprisedna.co/omni/book/?offer=replace-software&utm_source=github&utm_medium=readme&utm_campaign=minitab-engage).

MIT. Not affiliated with Minitab or Anthropic.
