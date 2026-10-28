---
name: mongo-read
description: Read live data from the project's MongoDB (SGMonti-Prod, schema test) through the IDE database MCP tools, for inspection or reporting, for example "what's in globalSettings", "how many users", "show me one priceIncreaseSettings doc". Use whenever the user asks to look at, count, or report on actual database contents. Read-only, strictly bounded queries.
---

# Mongo Read

This is the **production** cluster (`SGMonti-Prod`). Treat every query as if it could be seen by a customer.

## How to connect

Use the IDE database tools (WebStorm MCP). Every call needs `projectPath` = `C:/Users/lholk/WebstormProjects/sg-monti-com`.

| Argument | Value |
|---|---|
| `connectionId` | Look it up with `list_database_connections` (the MongoDB one, name starts with `@sgmonti-prod`). Do not hardcode it. |
| `databaseName` | `""` (empty string) |
| `schemaName` | `test` (all app collections live here: `test.*`) |

## Query forms (verified)

Run with `execute_sql_query`:

```js
// bounded read with projection
db.getCollection("globalsettings").find({}, {season: 1, priceIncreaseManualFlagId: 1}).limit(1)

// filtered read on a natural key
db.getCollection("users").find({userName: "<userName>"}, {password: 0}).limit(1)

// count (use this for any "how many" question)
db.getCollection("users").countDocuments({})
```

- Collection names are the **lowercase plural names in the database** (`globalsettings`, `priceincreasesettings`), not the Mongoose model names. If unsure, `list_schema_objects` (kind `table`).
- For "what does this collection look like" questions, use `get_database_object_description` first. It reads no documents. Cross-check against the Mongoose type in the repo; the DB can drift from the types.
- Prefer natural keys in filters (`userName`, `callLogId`, `season`), not `_id`.
- Keys that contain dots (e.g. inside `genLedgerAccountMap`, like `"102.1 - CK PAYMENTS"`) cannot be addressed with dotted paths. Project the parent object instead.
- Dates are ISO strings in app types, but the DB may hold `ISODate`. Say which you saw.

## Hard rules

1. **Read only.** No insert, update, delete, drop, index, or DDL through this connection, even if asked. Data changes go through the app code. Tell the user and offer to write the code instead.
2. **Never read everything.** No `find({})` without `.limit()`, no unbounded `find`, no `preview_table_data` with more than 3 rows.
3. **Hard cap: 3 documents per query**, unless the user **explicitly** asks for a different number in their prompt (e.g. "pull 20"). When you exceed 3 on that basis, say so in the report. A vague "show me the data" is not an override.
4. **Unclear request means clarify or sample one.** If the request does not make clear which collection, which record, or which fields the user wants, either ask (`ask_question`) or pull exactly **one** document and state that it is a single-document sample.
5. **Large collections always need a filter** on a natural key or an indexed field, plus `.limit()`: `customers`, `programs`, `services`, `calllogs`, `rgapilogs`, `punches`, `progservs`.
6. **Counts before samples.** If the question is about quantity, run `countDocuments` (with a filter when relevant), not a document pull.

## Sensitive data

- **`users`: never return the `password` field.** Every `users` query must project `{password: 0}` (or an inclusion projection that does not list `password`). Never filter on `password`, never print it, and never echo it if it appears in output from another path. Do not use `preview_table_data` on `users`, because it cannot exclude fields.
  - Safe fields: `userName`, `email`, `firstName`, `lastName`, `role`, `saId`, `mustChangePassword`, `createdAt`, `updatedAt`.
- `passwordresetrequests`, `employees`, `customers`, `punches`, `rgapilogs` hold PII, credentials-adjacent data, or raw API traffic. Project only the fields needed, summarize rather than dump, and do not reproduce tokens, API keys, or full customer contact details in the report.
- Do not paste production values into code, tests, fixtures, or docs. Tests build entities with `generateCustomer` (see the `write-tests` skill).

## Output handling

- Project fields (`{field: 1}`) instead of pulling whole documents whenever you know what you need.
- Results can be truncated by the tool. Narrow the projection and `limit` first. If output is still cut off, read the cached full output file with `read_files` using line ranges.
- Keep `maxRowCount` at 3 or less on `preview_table_data` (and never on `users`).

## Reporting

State: the collection, the filter and projection used, how many documents were read, and whether the result is a sample or complete. Call out anomalies (missing fields, duplicate or legacy fields, values that disagree with the Mongoose types).

## Collections in `test`

Grouped for orientation (confirm with `list_schema_objects`; this list can go stale). Large or sensitive ones are flagged.

- **Settings / config:** `globalsettings` (single document), `unitconfigs`, `prepayconfigs`, `priceincreasesettings`, `appmethods`, `searchoptimizers`, `syncmetadatas`
- **Auth / people:** `users` (never `password`), `passwordresetrequests` (sensitive), `employees` (sensitive), `employeeavailabilities`, `plannedtimeoffs`, `punches` (large, sensitive), `holidays`
- **RealGreen mirror:** `customers` (large, sensitive), `programs` (large), `services` (large), `progservs` (large), `calllogs` (large), `rgapilogs` (large, sensitive), `corruptedsyncrecords`
- **RealGreen reference:** `callaheaddocprops`, `conditiondocprops`, `flagdocprops`, `productdocprops`, `progcodedocprops`, `servcodedocprops`, `servicedocprops`, `callaheadkeywords`, `flagrules`, `priorityservices`, `serviceetas`
- **Scheduling / routes:** `assignments`, `assignmentgroups`, `assignmentscenarios`, `groupsequences`, `routenotes`
- **Equipment / inventory / products:** `equipment`, `equipmentpackages`, `inventorychecks`, `loadoutdocs`, `productcategories`, `pricetabledocs`
- **Price increase:** `seasonplans`, `seasonincreases`
- **Templates / forms:** `formlettertemplates`, `storedtemplates`, `storedtemplate2`, `templategroups`
- **Units:** `units`, `unitcrms`

## Verify

Before reporting, check that: the query had `.limit()` (or was a count), no `password` value appears in what you are about to show, and the document count matches the cap or the user's explicit override.

