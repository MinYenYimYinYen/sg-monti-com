# QBO Integration - Phase 1: Intuit Developer Setup

## Goal

Obtain sandbox credentials so the connection can be built and tested without touching the real books. These are tasks only you can do.

## Your Tasks

- [x] Create or sign in to an account at developer.intuit.com (use an Intuit login you control that can also administer the real QuickBooks company).
- [x] Create an app (My Apps > Create app) and select the **Accounting** scope (`com.intuit.quickbooks.accounting`).
- [ ] Open the app's Keys & credentials and copy the **Development (sandbox)** Client ID and Client Secret.
- [ ] Add Redirect URIs (must match exactly): `http://localhost:3000/qbo/connection/api/callback` for dev, plus the Vercel preview/production URL later. (Final path is set in Phase 2; update here if it changes.)
- [ ] Make sure you have a sandbox company (Intuit creates one with the developer account). Note it for Phase 2 testing.
- [ ] Add env vars to `.env.local`: `QBO_CLIENT_ID`, `QBO_CLIENT_SECRET`, `QBO_REDIRECT_URI`, `QBO_ENVIRONMENT=sandbox`.
- [ ] Generate a random 32-byte key for `QBO_TOKEN_ENCRYPTION_KEY` (for example `openssl rand -base64 32`) and add it to `.env.local`.
- [ ] Add the same five env vars in Vercel (Preview scope for sandbox values; Production scope later in Phase 7).
- [ ] In the sandbox company, create a credit card account and a couple of vendors/expense accounts so Phase 3 has data to read (or use the sandbox defaults).
- [ ] Check your app's pricing tier and API call limits in the developer portal. Expected to be a non-issue for monthly imports, but confirm.
- [ ] Deploy the legal pages (built in `src/app/legal/`) to production, then open both URLs in a private/incognito window while signed out and confirm they load without a login redirect:
  - EULA: `https://sgmonti.com/legal/terms`
  - Privacy policy: `https://sgmonti.com/legal/privacy`
- [ ] Review both pages for accuracy (company details, data practices, effective date). They are drafts, not legal advice.
- [ ] Paste those two URLs into the Intuit "Add your app's end-user license agreement and privacy policy" step.
- [ ] Deploy the new logout page (`src/app/auth/logout/page.tsx`) and confirm `https://sgmonti.com/auth/logout` signs you out and lands on the login page.
- [ ] In the Intuit "host domain, launch URL, disconnect URL, and connect/reconnect URL" step (these fields are written for customer-facing apps; ours is internal, so they point at our login/logout pages), enter:
  - Host domain: `sgmonti.com`
  - Launch URL: `https://sgmonti.com/auth/login`
  - Disconnect URL: `https://sgmonti.com/auth/logout`
  - Connect/Reconnect URL: `https://sgmonti.com/auth/login?from=/qbo/connection` (after login the user lands on the connection page, built in Phase 2)
- [ ] Register the production Redirect URI `https://sgmonti.com/qbo/connection/api/callback` in the Intuit app's production settings (see also `qboPhase7.md`).
- [ ] Note: `/qbo/connection` requires login, so Intuit reviewers cannot open it. If the form or review asks, explain that this is a private internal app for employees of one company.
- Unconfirmed: Intuit's docs describe the Disconnect URL as a page telling the user the connection ended. Our logout page includes a short note about reconnecting for that reason. If Intuit's review objects, add a dedicated public page.
- [ ] Start the production-keys questionnaire early (privacy policy URL, EULA/terms URL, hosting details, etc.). It is not needed until Phase 7 but can take time. See `qboPhase7.md`.

## Our Tasks

- Nothing until you have sandbox credentials. Tell us when the env vars are set.

## Done Criteria

- [ ] Sandbox Client ID and Secret exist in `.env.local` and Vercel Preview.
- [ ] Redirect URI registered in the Intuit app.
- [ ] Sandbox company available.

## Notes

- QBO has no static API key. Access comes from an OAuth 2.0 consent by a company admin (done in-app in Phase 2).
- Sandbox and production use different keys and different apps' key sets.