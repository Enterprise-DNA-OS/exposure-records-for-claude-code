# Exposure Records for Claude Code

Keep exposure sampling evidence, review decisions and control follow-up in your own database. A focused alternative for the records desk around Cority Industrial Hygiene.

Built by Enterprise DNA. MIT licence. Works with Claude Code, Codex, OpenCode or Cursor.

| Do it yourself | We customise it | We run it for you |
|---|---|---|
| Free. Install the database and commands below. | Your groups, review rules, export mapping and reports. | Installed and operated through Omni by Enterprise DNA. Setup fee, then a retainer. |
| [Quick start](#quick-start) | [Get your version built](https://enterprisedna.co/omni/book/?offer=replace-software&utm_medium=github&utm_campaign=cority-industrial-hygiene) | [Book a call](https://enterprisedna.co/omni/book/?offer=replace-software&utm_medium=github&utm_campaign=cority-industrial-hygiene) |

## Quick start

Node 22 or newer. No Cority account, instrument or hosted database is needed for the fictional demo.

```bash
git clone https://github.com/Enterprise-DNA-OS/exposure-records-for-claude-code.git
cd exposure-records-for-claude-code
npm install
npm run demo
npm run exposure -- lab-review
npm run view
npm run docs
```

The demo contains two fictional sites, four exposure groups and four samples. A mixing crew has follow-up that is overdue. A fibre record lacks method evidence. A packing group has no saved sample. A lower follow-up result stays unreviewed until the hygienist records a decision. All result values are fictional and imply no exposure conclusion.

PGlite stores data in .data/db. DATABASE_URL selects PostgreSQL. Run npm run migrate before using a new database. Shared deployments need enforced identity, access controls, backups and a reviewed retention and disclosure process. The CLI uses a trusted operator connection.

## The working week

1. /sampling-plan lists planned work, owners and missed dates.
2. /coverage-review finds groups with no saved samples.
3. /lab-review lists records awaiting qualified review or more evidence.
4. /control-review connects human follow-up decisions to actions.
5. /weekly-review drafts a Monday report from coverage, attention and record controls.

29 CLI verbs and 35 task commands ship in .claude/commands, including /customise and /new-view. Run npm run exposure -- help. The CLI displays readable columns by default and --json for processing. Case-insensitive names and ID prefixes work. Ambiguous names list candidates and exit 1.

## Bring the records across

Cority describes CSV export through its ad hoc reporting. Each tenant can have different report headings. Map your actual report once, then bring it across in one import. Review the row count and original dates first. The [switching guide](docs/replace-cority-industrial-hygiene.md) defines the exact mapping and records that need additional migration.

```bash
npm run exposure -- import cority --source="Demo export" --file=examples/cority-samples.csv --expected-count=2 --source-ref="Fictional fixture, all rows" --actor="Demo operator" --dry-run
```

Repeat without --dry-run to save the two fictional records. Real imports require the actual source namespace, report reference, actor and count. The whole file succeeds or nothing changes. Repeated identical rows skip. A changed source ID is refused, preserving original evidence. CSV values remain text with units and qualifiers intact. No exposure level is calculated.

## Ten questions to ask

These questions run today. Cority has configurable reporting too; no claim is made that it cannot answer them. The difference is an owned combination of imported evidence, local reviews and follow-up.

1. Which exposure groups have no saved samples? `coverage`
2. Which lab records still await a qualified review? `lab-review`
3. Which sampling tasks have missed their agreed dates? `plans`
4. Which control follow-ups are overdue and who owns them? `actions`
5. Where has a reviewer requested follow-up without an open action? `compliance`
6. Which samples have no recorded method reference? `compliance`
7. What changed between the first review and the latest one? `sample`
8. Which records carry a NZ asbestos retention date? `samples`
9. Which imported batches support this week’s review? `imports`
10. Which site needs its access arrangements reviewed? `compliance`

## Your first hour: ten things to ask for

1. Put our business name, colours and logo in brand.json.
2. Register our real sites and jurisdiction.
3. Record our exposure groups and agents.
4. Agree the review and sampling dates with our hygienist.
5. Check our actual Cority report columns.
6. Reconcile the exported count and original record dates.
7. Import a preview and inspect every missing reference.
8. Assign follow-up owners and evidence requirements.
9. Render our private sampling briefs and result packets.
10. Add a field or read-only view for our weekly review.

/customise writes and tests a new migration. /new-view adds a branded read-only report. Original samples, reviews, imports, notes and events are append-only. The database owner can bypass these controls, so they are not an authenticated audit service.

## Reports and responsibilities

npm run docs creates sampling briefs and result review packets in docs-out. npm run view writes views/week.html. Both use brand.json and escape imported text. Drafts and reports remain private. There is no sender or notification worker.

A qualified hygienist supplies sampling decisions and interprets results. record_checked means evidence checked, never safe exposure. Closing an action never changes the source sample. [Record controls](docs/compliance.md) cite NZ retention guidance and clearly mark local policy and Australian jurisdiction checks. Source reports stay in your controlled evidence store; the base holds references, not attached files. Clinical histories and worker identities are outside this desk.

Cority also supplies monitoring analytics, field capture and wider health and safety workflows. Enterprise DNA scopes the screens and connections required for your custom version. Keep existing operational controls until the replacement meets your requirements. [Why no front end](docs/why-no-front-end.md).

## Backup and validation

npm run exposure -- export --file=exports/backup.json writes all nine domain record types to a new private file. It refuses overwrites. Keep native database backups and original exports too. Automated JSON restoration is not included; test your native backup restore process before using real records.

npm test checks all 29 verbs, atomic imports, repeat imports, source conflicts, header mapping, evidence preservation, NZ 30/40-year dates, leap days, Australian unknowns, ambiguous matching, action closure, JSON export and escaped HTML. See [validation](docs/validation.md) for actual execution and [research](docs/research.md) for the selection evidence.

Built and optionally operated through [Omni by Enterprise DNA](https://enterprisedna.co/omni/instead-of/cority-industrial-hygiene?utm_source=github&utm_medium=readme&utm_campaign=cority-industrial-hygiene).
