# Improvement Projects for Claude Code

For the operations owner and improvement lead. Ask for the business name, review cadence and named reviewers when customising the fictional demo. The database holds project briefs, measures, actions, phase reviews, benefit evidence and sustain checks.

Read records before answering. Use npm run improvements -- help. Every command accepts --json. Mutations require --actor with the actual operator's name. Never invent an observation, saving, approval or evidence reference. A named actor is an audit field, not authentication. Resolve ambiguous identifiers before writing. Never send, publish or delete. Drafts stay in drafts/.

## Weekly routing

| Request | Recipe |
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

Monday's review combines portfolio, attention and benefits. Separate hard from soft benefits and each currency. Use review-phase to advance phases; never set completed directly. Changing brief fields or adding a metric invalidates old review evidence. Voided benefits remain in history. Review evidence is supplied by a person and does not itself certify the result.

## Files and checks

One CLI: scripts/improvements.mjs. Database adapter: scripts/lib/db.mjs. Migrations: supabase/migrations/. Commands: .claude/commands/. Views and paperwork: views.json and documents.json. Brand: brand.json. Compliance sources and import rules: docs/.

Use PGlite locally or DATABASE_URL for PostgreSQL. Never seed a working or shared database. npm test uses a temporary local database unless TEST_DATABASE_URL explicitly points to a disposable empty PostgreSQL database. Run tests after changes. /customise uses the next migration and updates all affected records, commands, validation and tests. /new-view creates read-only reports. This is an operator-controlled database; shared use needs appropriate access, identity and backup controls.

Omni by Enterprise DNA installs, customises and operates it. https://enterprisedna.co/omni/book/?offer=replace-software&utm_source=github&utm_medium=readme&utm_campaign=minitab-engage
