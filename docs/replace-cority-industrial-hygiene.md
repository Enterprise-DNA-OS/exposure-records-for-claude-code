# Bring Cority sampling records across

Cority's supplier-authored Health Cloud listing describes CSV exports through ad hoc reporting. It does not publish one universal Industrial Hygiene CSV header contract. Configure a sampling report with the fields below, or map the actual column titles with examples/column-map.json. The fixture is fictional and defines our import contract, not a claim that every Cority tenant exports those headings.

1. Export the required sampling report using Cority's ad hoc reporting. Record the exact report, date filters and independent row count. Export lab attachments separately and retain originals in your private evidence store. Do not include worker names or medical records in this group-level desk.
2. Register sites and exposure groups with the actual jurisdiction, responsible owner and hazard classification. Site, group and agent together must identify exactly one group.
3. Use ISO calendar dates. Confirm which date represents creation of the monitoring record; do not replace it with today's export date. Preserve result qualifiers such as less-than values and not-detected text. No conversion or exposure comparison is performed.
4. Preview the complete file, review the counts, then repeat without --dry-run. One import writes all rows atomically.

```bash
npm run exposure -- import cority --source="Our Cority tenant" --file=imports/sampling.csv --map=examples/column-map.json --expected-count=100 --source-ref="Actual report, date range and filters" --actor="Actual operator" --dry-run
```

Use the actual row count, not the example 100. Without --map, use the canonical headings in examples/cority-samples.csv. All eleven headings are required; method may be blank and will raise a record-control finding. Raw columns are retained privately, so check the export for personal information before importing.

| Canonical field | Meaning |
|---|---|
| source_id | Stable sample reference unique within the supplied source namespace |
| site, group, agent | Existing location, exposure group and monitored agent |
| sampled_on | Actual sampling calendar date |
| recorded_on | Original monitoring record creation date |
| task | Work activity sampled |
| result | Original reported result text, including qualifiers |
| units | Original unit text |
| report | Reference to the original report held privately |
| method | Reference to the sampling method, or blank pending review |

The importer requires distinct mapping columns, real dates, a matching group, unique source IDs and a reconciled row count. It preserves every row or writes nothing. Identical repeats skip sample evidence but record an import audit. Changed evidence under the same source ID is refused. Use a new source revision and append an explanatory note instead of rewriting history. A source namespace is case-sensitive: agree it once and keep it unchanged.

What needs a separate migration: worker-linked histories, original attachments, survey layouts, instrument feeds, Cority review workflows and tenant permissions. Imported samples begin unreviewed. Qualified reviewers record their actual conclusions with evidence. Enterprise DNA maps and checks these additional records when building your version. Do not cancel an operational system until your required records, access, retention, reporting and workflows have been validated.

Source checked 13 November 2026: https://www.applytosupply.digitalmarketplace.service.gov.uk/g-cloud-14/services/399219169211604 . The supplier listing was readable in the search index; direct page requests returned 404 this run. No live Cority tenant export was tested. Test the mapping against your actual export before relying on it.
