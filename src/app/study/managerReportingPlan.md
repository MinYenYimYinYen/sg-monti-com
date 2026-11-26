# Manager reporting plan

Status: **planned, not built.** Nothing in this document exists in code yet. When a phase is built, describe it in `study.readme.md` and remove or mark it done here.

## 1. Why

Employees must pass licensing exams, and managers need to prepare them. Every answer is already recorded in `ReviewLog` (who, which card, when, knew or missed, the phase before, the interval before and after) and each person's standing on each card is in `CardSchedule`. Nothing reads that data back for a manager. This plan adds the screens and ops that do.

The questions a manager is trying to answer, most frequent first:

1. **Who is studying, and who is not?** Who has answered anything in the last week.
2. **Who is on track for the exam?** How much of the deck each person has learned, against how long is left.
3. **Where is a person weak?** The cards they keep missing, and which sections those belong to.
4. **Where is the whole team weak?** Cards most people miss, which may mean a badly written card or a section that needs teaching.

## 2. What the data supports today, and what it does not

From `ReviewLog` and `CardSchedule`, with the indexes that exist: on the log `{ userName, reviewedAt }`, `{ userName, deckKey, reviewedAt }` and `{ cardKey }`; on schedules a unique `{ userName, cardKey }` and `{ userName, deckKey, dueAt }`.

| Measure | Source | Supported |
|---|---|---|
| Answers per person per day | `ReviewLog.reviewedAt` | Yes |
| Last time a person studied | `ReviewLog.reviewedAt`, newest | Yes |
| Share of knew answers | `ReviewLog.outcome` | Yes |
| Cards a person has started | `CardSchedule` count | Yes |
| Cards a person has graduated to review | `CardSchedule.phase` | Yes |
| Cards a person has mature (interval 21 days or more) | `CardSchedule.intervalDays` | Yes |
| Cards a person keeps missing | `CardSchedule.lapses`, `ReviewLog` misses | Yes |
| Cards due now (a backlog) | `CardSchedule.dueAt` | Yes |
| Team-wide misses per card | `ReviewLog` by `cardKey` | Yes |
| Time spent studying | none | **No.** Only answer times are stored, not how long a card was on screen |
| Opened the app but answered nothing | none | **No** |
| A person's history after they are deleted | none | **No.** `CardSchedule` and `ReviewLog` are deleted with the user, by decision. A report covers current employees only |

Two consequences:

- **Deleted users leave no trace.** A manager comparing quarters will see the team shrink if someone left. Say so on the screen. If departed employees' results ever matter (for example to prove training was done), that reverses the "deleted with the user" decision recorded in `StudyTypes.ts` and `mongo.readme.md`, and needs its own decision first.
- **No exam outcome is recorded.** The system knows what a person studied, not whether they passed. A "pass rate" report would need a new record, entered by hand.

## 3. Who may see what

A new capability in the existing "Study" group, so one admin matrix row covers it:

| Capability | Verbs | Covers |
|---|---|---|
| `studyReports` | `read` | Every employee's progress and answers, in every deck |

It is **separate from `studyCardAdmin` and `studyCardStudent`**, matching the decision that those never imply each other. A manager who only reports needs only this. One who also authors cards needs both. Put a code comment beside the resource saying it exposes a named person's study record.

An employee seeing **their own** progress is not a report. It is a student feature (section 8) and uses `studyCardStudent.read`, with the caller's `userName` taken from the verified session as `getMyReviews` does today. A manager op must never be reachable with a `userName` from a student op, and a student op must never accept a `userName` from the client.

## 4. Decisions to make before building

These change the shape of the work. A recommended answer is given for each.

1. **Which employees does a report cover?** Recommended: the users who hold `studyCardStudent.read`. It is the honest definition of "expected to study", needs no new list, and the admin screens already compute holdings (`loadUserNamesWithAccess`, `userNamesWithAccess`). The cost is that a bundle change silently changes who appears. Alternatives: everyone with an account (noisy), or a list a manager keeps (more to maintain).
2. **What counts as "on track"?** It needs a target. Recommended: no verdict in phase 1. Show the numbers and let the manager judge. Add a verdict only once the exam date is per deck (phase 2).
3. **Is the exam date global or per deck?** Today it is one global value, `STUDY_CONFIG.scheduling.examDate`, null. Reports across decks with different exams need it per deck, on `StudyDeckDoc`. Do this in phase 2, not before.
4. **How far back does the log go?** There is no retention rule, so the log grows forever. At 100 employees answering 100 cards a day that is about 3.6 million rows a year: fine for Mongo with the existing indexes, not fine for a report that loads rows. Recommended: reports aggregate in the database, and the log is not trimmed until measurement shows a problem.
5. **Do managers see answers, or only totals?** Recommended: both, behind the same capability, and say plainly on the screen that it is a named person's record.
6. **Is this reporting on people or on content?** Team-wide misses per card is content quality and needs no names. Recommended: build it as an admin feature under `studyCardAdmin`, not under `studyReports`.
7. **Does the company want managers to see this at all?** Employees may not expect their study activity to be visible. That is a policy decision, not a technical one, and it should be settled before phase 1 ships.

## 5. Phases

Each phase is shippable on its own.

### Phase 1: Team overview

One screen and one op. For every covered employee, in a chosen deck:

- Last answered (date), and answers in the last 7 days.
- Cards started, in review, and mature, out of the deck's published cards.
- Share of knew answers over the last 30 days.
- Cards due now.

Sorted so people who have not studied are at the top. No verdict and no exam date.

**Op:** `getTeamProgress`, gated by `studyReports.read`, params `{ deckKey }`, result one row per covered employee. Built from **two aggregations**, not by loading rows: one over `CardSchedule` grouped by `userName` for the counts, one over `ReviewLog` filtered to the last 30 days and grouped by `userName` for the answers. The two are merged on `userName` by a pure function together with the covered user list and `UserSummary` names.

**Pure logic** (testable without a database): `buildTeamProgressRows` takes the two aggregates, the covered users and `now`, and returns rows with "days since last answer" and the sort order.

**Screen:** `/study/reports`, a table with a row per person and a deck picker, wrapped in `GatedPanel` on `studyReports.read`.

**Needs:** the capability, one contract op, one handler file, one slice and selector, one page. No change to the existing collections, and no new index: `{ userName, deckKey, dueAt }` on schedules and `{ userName, deckKey, reviewedAt }` on the log already cover both aggregations.

### Phase 2: One person, and the exam

- **Person detail:** click a row to see that person's answers per day for the last 30 days, their weakest cards, and their backlog.
- **Per-deck exam date** on `StudyDeckDoc` (`examDate: string | null`), set when a deck is created or edited, and used by both the scheduler (replacing the global value) and the report.
- **An "on track" indicator** for a deck with an exam date: the share of the deck that should be mature by now against the share that is.

The scheduler change is the risky part, because it changes when cards are due for everyone. `capDueAtForExam` must take the deck's date. Cards already scheduled past the exam fix themselves on their next answer, or can be swept.

**Ops:** `getPersonProgress` (`{ deckKey, userName }`, `studyReports.read`). **Types:** `StudyDeckDoc.examDate`. **Edits:** `createDeck`, and a new `editDeck`.

### Phase 3: Where the team is weak

- **Hardest cards:** per card, the number of people who answered, the share who missed, and lapses, sorted by misses.
- **Hardest sections:** the same grouped by `sectionTitle` and `sourcePage`, so a manager can see "everyone struggles with backflow prevention".
- A link from a hard card to the review screen, so a badly written card can be fixed.

This is content reporting and needs no names (decision 6), so the capability is `studyCardAdmin.read` and the screen sits beside the review screen. A minimum number of answers (for example 5) before a card is ranked, so one bad day does not make a card look hard.

**Op:** `getCardDifficulty` (`{ deckKey }`), one aggregation over `ReviewLog` grouped by `cardKey`, joined to the cards in the handler.

### Phase 4: Exports and lists (only if asked for)

- A CSV export of the overview, to paste into the training record a manager already keeps.
- A list of people with no activity for N days, for a manager to act on by hand.
- **Not** automatic email or messages. There is no email in this system (password resets are admin-assisted), so any notification is a new integration and needs its own plan.

## 6. Design rules for this work

- **Aggregate in the database.** Use `aggregate` with `$match` and `$group` against the existing indexes. Never `find` the log and add up in Node or the browser.
- **Pure logic for every number.** Rows are built by plain functions from plain inputs, so they can be tested with fixed data. Selectors and components stay thin.
- **Days are days in the business time zone.** Use `dayKeyOf` from `studyQueueLogic.ts` with `STUDY_CONFIG.dailyLimits.timeZone`, so a late-evening answer lands on the right day. Bucketing in MongoDB needs the same zone passed to `$dateToString`, and the log stores `reviewedAt` as an ISO string, so convert in the pipeline or bucket in the pure function after a bounded read.
- **The clock is passed in.** A report function takes `now`, as the scheduler does.
- **Names come from `UserSummary`,** the safe summary with no password hash or email, never from the user model directly.
- **A manager op never trusts the client for identity or scope.** The covered users are computed on the server.
- **Show who is covered, and why,** so a missing person is explained and not a mystery.
- **Same module, same readme.** Reporting code lives under `src/app/study/` (screens under `src/app/study/reports/`), and `study.readme.md` is updated as each phase lands.
- **Follow the repo's data-module pattern:** types, contract, route, slice, selectors, hook. Use the `data-module`, `permission` and `api-route` skills, and add the new capability through the `permission` skill.

## 7. Open risks

- **Performance at scale is unmeasured.** The indexes cover the planned aggregations, but nothing has run against real data. Check the plan with `explain` on the first real deck before building phase 3.
- **Time zone edge cases.** "Last 7 days" and "today" must use the business time zone. A report run after midnight UTC but before midnight in Chicago is the case to test.
- **`reviewedAt` is a string.** Range filters on it work for ISO strings, but date arithmetic in an aggregation needs a conversion (`$dateFromString`) that can stop an index being used. Measure before relying on it. If it hurts, store a `dayKey` on each log row going forward, which is a model change and needs a decision.
- **The user list can lag.** Holdings are read at request time, so a person whose bundle was just removed drops out of the report at once, with their history intact until the account is deleted.
- **Misreading the numbers.** A person who answers 20 new cards and never returns looks like one who studied for a week. Show both "cards started" and "days with answers" so the difference is visible.
- **Privacy expectations** (decision 7). Settle the policy before shipping, and tell employees on the study screen that managers can see progress.

## 8. Related: a student's own progress

Not a manager report, and a good first step because it needs only `studyCardStudent`. A small panel on the study screen showing the person's own numbers: cards started, in review and mature, answers this week, and a streak. It reuses the phase 1 pure logic for one person. It also makes the privacy point concrete, because people see the same numbers a manager would. Build it with phase 1 or just before.

## 9. Testing

All of the following are pure and can be tested without a database. Read `src/__tests__/testing.readme.md` first, and use the `make*` builders where the repo requires them.

- `buildTeamProgressRows`: ordering, a person with no log rows, a person with no schedules, a person who answered only on a day boundary.
- Day bucketing across the Chicago midnight and across a daylight saving change. `dayKeyOf` already exists and should be covered here.
- The covered-user rule: a user holding the capability through a bundle, directly, neither, a superuser, a kiosk.
- The difficulty ranking: the minimum-answers rule, ties, a card nobody has answered.

## 10. Keeping this plan current

When a phase is built, describe the result in `study.readme.md` (add a "Reporting" section, and an entry for each new op in its API table) and delete or mark that phase here. If the direction changes, edit this file and say what changed and why, so the next reader does not follow a stale plan. If the review log, its keys, or the rule that deletes it with the user change, revisit sections 2 and 3 first.

