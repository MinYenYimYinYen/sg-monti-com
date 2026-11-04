# QBO Integration - Intuit Production Questionnaire: Answers as Commitments

These are the answers given on Intuit's production-keys questionnaire. Each is a promise about how the app behaves, and Intuit may test them. Every row has a checkbox: tick it only when the behavior is built and verified. **Before submitting the questionnaire (or before going live), recheck every answer against what was actually built.** Update this file if an answer changes.

Status when written: nothing below is built yet. The answers describe the planned design.

Phase numbers in the "Delivered by" columns use the original numbering (now in `archive/`). Map them to `qboPlan.md` as follows: original Phases 1 and 2 are now Phase A (connection) and Phase B (read layer, logging); original Phase 3 (reference data) is now Phases B and C; original Phase 6 (posting) is now Phase E; original Phase 7 (cutover and hardening) is now Phase F. The sandbox no longer exists, so the error-handling tests in the "Error handling and logging" section run against live data as described in `qboPlan.md` (Phase E).

## Token handling

| Question | Answer | Delivered by | Built and verified |
|---|---|---|---|
| How often does the app refresh access tokens? | Only when access tokens expire | Phase 2 | [ ] |
| Does the app retry failed authorization/authentication requests? | Yes: one retry after refreshing on a 401; bounded retry with backoff on 429 and timeouts; no retry loops | Phase 2 | [ ] |
| On an authorization/authentication error, are customers asked to reconnect? | Yes: status page shows "reconnect required", posting is disabled, rows stay `pending` | Phases 2 and 7 | [ ] |
| Used the Intuit discovery document for OAuth endpoints? | Yes | Phase 2 | [ ] |
| Handles expired access tokens? | Yes | Phase 2 | [ ] |
| Handles expired refresh tokens? | Yes | Phases 2 and 7 | [ ] |
| Handles invalid grant errors? | Yes: treated as final, tokens cleared, no retry loop | Phase 2 | [ ] |
| Handles CSRF errors? | Yes: one-time `state`, expires after about 10 minutes, deleted on first use | Phase 2 | [ ] |
| Relies on the OAuth Playground or offline tools for tokens? | No | n/a | n/a |

## Product behavior

| Question | Answer | Delivered by | Built and verified |
|---|---|---|---|
| Handles users gaining or losing version-specific QuickBooks features? | Yes: core accounting features only; per-transaction errors read and shown; pre-flight check that vendors/accounts are active; re-sync on deactivated records; failed transactions stay unposted and retryable | Phases 3 and 6 | [ ] |
| Uses the CDC (Change Data Capture) operation? | No: full paginated queries only | n/a | n/a |

Draft text submitted for the version-features answer: the app is a private internal tool, uses only vendors, accounts and credit card expense (Purchase) transactions, reads errors per transaction, shows the specific message, keeps failed items unposted, and checks that references are active before posting.

## Error handling and logging

| Question | Answer | Delivered by | Built and verified |
|---|---|---|---|
| Tested that the app handles API errors, including syntax and validation errors? | Yes | Phase 6 (sandbox tests below) | [ ] |
| Captures the `intuit_tid` response header? | Yes: on every response, success or failure, including OAuth token and revoke calls | Phase 2 | [ ] |
| Stores all error information in logs that can be shared for troubleshooting? | Yes: per-call QBO API log (see Logging in `qboPlan.md`) with a viewer | Phases 2 and 7 | [ ] |

The "tested" answer is only true after the error-handling tests run (Phase E in `qboPlan.md`; no sandbox, so against live data with harmless or deliberately bad requests): a syntax error (malformed request body) and a validation error, with the real fault payloads recorded.

## Security and data handling

| Question | Answer | Delivered by | Built and verified |
|---|---|---|---|
| Security breach ever requiring notification to customers or authorities? | No | n/a (statement about the company) | n/a |
| Security team that regularly assesses vulnerabilities and risks? | Yes | n/a (statement about the company; be ready to describe it if Intuit asks) | n/a |
| Client ID and client secret stored securely (not hardcoded, not in browser console logs)? | Yes: env vars only (`QBO_CLIENT_ID`, `QBO_CLIENT_SECRET`); no `NEXT_PUBLIC_` prefix on any QBO variable; never in client bundles, logs or error responses; the log `redact` helper excludes them | Phases 1 and 2 | [ ] |
| Uses multi-factor authentication? | No (login is username and password only) | n/a | n/a |
| Uses Captcha for authentication? | No | n/a | n/a |
| Uses WebSocket? | No (HTTP RPC routes and HTTP NDJSON streaming only; none in the codebase) | n/a | n/a |
| Is a customer's Intuit data used by or shown to anyone other than that customer? | No: all Intuit data is used only for the benefit of the original customer (the company) | Phases 3 and 5 | [ ] |

Notes:
- The data-use answer holds only while mirrored QBO data (vendors, accounts, import rows, logs) stays behind login with the planned role checks. If the app ever exposes it elsewhere, this answer becomes untrue.
- Optional, not required by the form: MFA for the admin who connects QuickBooks, since that access is powerful.

## Open questions

- [ ] Support contact: the questionnaire asks whether customers can contact support from within the app. Record the answer given. If Yes, add a "Contact support" link (luke@sgmonti.com) to the connection page (Phase 2).
- [ ] Log retention and log access: defaults are unconfirmed (see Logging in `qboPlan.md`).

## Other answers recorded elsewhere

- Host domain, Launch, Disconnect and Connect/Reconnect URLs: `qboPlan.md` (Auth and connection).
- EULA and privacy policy URLs: `https://sgmonti.com/legal/terms` and `https://sgmonti.com/legal/privacy`; pages in `src/app/legal/`.