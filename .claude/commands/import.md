---
description: Import a mapped Cority sampling CSV atomically
---

Read docs/replace-cority-industrial-hygiene.md first. Confirm the actual export columns, source namespace, original dates and independent count. Use --map for different headings. Run the exact command with --dry-run first, review counts, then repeat without that flag within the authorised import. Every error is a stop; never drop a row to make counts pass.

```bash
npm run exposure -- import cority --source="<actual source>" --file="<actual file>" --expected-count="<actual expected-count>" --source-ref="<actual source-ref>" --actor="<actual actor>" --json
```
