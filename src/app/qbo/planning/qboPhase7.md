# QBO Integration - Phase 7: Production Cutover

## Goal

Move from the sandbox to the real company safely, and make sure the connection does not silently lapse.

## Your Tasks

- [ ] Complete the Intuit production-keys questionnaire (privacy policy URL, EULA/terms URL, hosting and security details, etc.). Started in Phase 1; submit now.
- [ ] Wait for approval and copy the **Production** Client ID and Client Secret.
- [ ] Register the production Redirect URI `https://sgmonti.com/qbo/connection/api/callback` in the Intuit app's production settings. Set `QBO_REDIRECT_URI` to exactly the same value.
- [ ] Confirm the host domain (`sgmonti.com`) and the Launch (`/auth/login`), Disconnect (`/auth/logout`) and Connect/Reconnect (`/auth/login?from=/qbo/connection`) URLs are entered in the Intuit app, as in `qboPhase1.md`.
- [ ] Set Vercel Production env vars: `QBO_CLIENT_ID`, `QBO_CLIENT_SECRET`, `QBO_REDIRECT_URI`, `QBO_ENVIRONMENT=production`, and the **same** `QBO_TOKEN_ENCRYPTION_KEY` as `.env.local`. Dev and production share one MongoDB, so both must decrypt the same token document. (An earlier version of this plan said to use a new key; that only works if the two environments use separate databases.)
- [ ] Make sure the person who connects is an admin on the real QuickBooks company.
- [ ] Connect the app to the real company from the Connect page and run the status smoke test.
- [ ] Run the Phase 3 sync and check the vendors and accounts against QBO.
- [ ] First real import: use a small file (a few rows). Verify in QBO: vendor, account, date, amount, memo, and the Ref no. marker. Delete the test entries in QBO if needed.
- [ ] Import a full month. Compare totals against the card statement.
- [ ] Record the connection date and the refresh-token expiry shown on the status page in a calendar reminder.

## Our Tasks

- [ ] Environment safeguard: show a clear banner when `QBO_ENVIRONMENT` is `sandbox`, so nobody mistakes sandbox for the real books.
- [ ] Status page warning when the refresh token is within about 30 days of expiry, with a Reconnect button. Verify the current maximum refresh-token lifetime in Intuit's docs.
- [ ] Handle a revoked grant gracefully: the status shows "reconnect required" and posting is disabled, rows remain `pending`.
- [ ] Short runbook: how to reconnect, how to re-sync, what to do with `failed` and `unknown` rows, and how to find a call in `/qbo/log` by `intuit_tid` to send to Intuit support.
- [ ] Walk through `qboQuestionnaire.md` and tick each answer only after verifying the built behavior matches. Correct any answer that no longer matches before submitting the production-keys form.

## Done Criteria

- [ ] A full real month posted, totals match the statement.
- [ ] Expiry warning visible on the status page.
- [ ] Sandbox and production data are not mixed (separate databases or clearly separated records, confirm at this phase).