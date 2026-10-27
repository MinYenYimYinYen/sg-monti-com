# RingCentral Onboarding Log

Running record of what we try and learn while working through RingCentral's developer onboarding. Newest entries go at the bottom of the log section. The sandbox page for this work is `src/app/sandbox/rcOnboard/page.tsx`.

## Decisions

- **2026-10-27: RingEX only.** We will not use anything exclusive to RingCX. The existing RingCX Digital webhook and REST scaffold under `_lib/` and `api/webhooks/` is parked, not deleted. Do not extend it unless this decision changes.

## Project facts

- `src/proxy.ts` lets any path containing `/api` through without auth (Gate A). Sandbox pages are behind the normal app login.
- No custom CSP or frame headers are set in `next.config.ts`.

## Log

### Step 1: Embeddable phone (sample page)

- **Source:** onboarding page "Make a sample API call", step 2 (create a local webpage). The sample is a static HTML page that injects `https://apps.ringcentral.com/integration/ringcentral-embeddable/2.x/adapter.js`.
- **Approach:** ported to a Next.js client page using `next/script` (afterInteractive) instead of the raw `createElement` snippet, so it does not add the script repeatedly. Bootstrap and the stock image were dropped.
- **No client ID** is set in the sample, so it uses RingCentral's shared default app.
- **Open questions:**
  - Which account type can sign in through the default app (developer sandbox or production)?
  - Is the widget container id really `rc-widget`? (used for cleanup on navigation)
- **Result:** works (2026-10-27). See below.

#### Step 1 result (2026-10-27)

- The Embeddable phone loaded in our Next.js page through `next/script` with the sample unchanged and no credentials from this project. The status line read "loaded" and the widget rendered at the bottom right.
- **Outbound call:** placed from the page and connected. The widget showed a live call with timer, mute, hold, keypad, add and stop controls.
- **Inbound call:** also tested, and it works.
- The widget showed a "FOR DEMO PURPOSES ONLY" banner. We do not yet know what it restricts. It probably comes from the shared default app.

**What we learned**

- RingCentral browser telephony works inside our app in both directions.
- The widget is a prebuilt UI client. This step gave our own code no access to call data, so it proves the platform works but does not show what the API can do for us.
- Sandbox pages need the normal app login. The page ran behind it and nothing in our headers blocked the widget.

**Still open**

- Account type used for sign-in (developer sandbox or production).
- Whether the widget container id is really `rc-widget`. We have not confirmed the phone disappears when navigating away.
- What the demo banner limits.
- The widget `postMessage` event bus might let us capture call events. Not tried.

**Decision:** the sample is a proof of concept only. Next is a custom app with our own client ID.
### Step 2: Custom RingCentral app and feature design

Recorded 2026-10-27.

#### Feature goal

A CSR answers calls inside sgmonti.com. While the call runs, AI identifies the conversation topic and shows guidance from a Mongo collection of topics. Recordings are never stored beyond the call. The RingCentral desktop app is currently the team phone (no hard phones).

#### Decisions

- **Softphone runs in our page.** Audio can only be reached if the phone runs as our own JavaScript. The Embeddable widget we tested is a cross-origin iframe, so our code cannot read its audio. The plan is the RingCentral Web Phone SDK (not yet verified against current docs).
- **CSRs answer in SGMonti.** CSRs agreed to answer calls on the site instead of the desktop app, provided it works reliably.
- **Web app beats a desktop app for this.** A desktop app could capture system audio and keep the existing phone, but it would capture everything the PC plays, give us no call control, need an installer and updates on every PC, and be a second codebase. The Web Phone route gives separate remote (customer) and local (agent) tracks, call control, and no install. Fallback if web audio proves unreliable: an Electron shell that loads sgmonti.com with a native audio bridge.
- **Auth: 3-legged OAuth, server-side web app.** CSRs sign in as themselves. The client secret and refresh tokens stay on our server. A separate JWT app is for later background work such as missed-call stats. We believe the auth flow cannot be changed after app creation (unverified).
- **Redirect URI:** `https://sgmonti.com/ringCentral/auth/api`. Matching is exact. A localhost entry is needed for local testing, and the form may refuse `http` (to be checked).
- **Callback security:** `src/proxy.ts` lets any path containing `/api` through without a login check, so the callback is public. It must validate an OAuth `state` value (random value in an httpOnly cookie, compared on return) before exchanging the code.
- **No stored recordings.** Audio is handled as a live stream and discarded. RingCentral's own recording feature is not used. The transcription vendor still receives audio, so its retention policy matters.
- **Transcripts:** logged during development, and the logging must be removed or gated before production. Memory-only is the production default.
- **Transcription vendor: undecided.** To be chosen. Claude does not take audio input, so a separate streaming speech-to-text step is needed.

#### Pipeline (planned)

1. Browser: Web Phone SDK answers the call. Remote and local tracks stay separate, which gives speaker labels.
2. Browser to speech-to-text vendor with a short-lived token issued by our server (avoids long-lived WebSockets in Next.js routes).
3. Server: transcript chunks go to Claude, which returns a `topicKey` and confidence. The server reads the full guidance from Mongo by that key.
4. UI: a side panel shows the topic and guidance.

#### Draft topic shape (not final)

TopicDoc: `topicKey` (natural key), `name`, `description` (when it applies, used to classify), optional `signals`, `guidance`, optional `avoid`, optional `escalateTo`, `updatedAt` (ISO string). Claude gets the list of `topicKey` plus `description` on each request and never writes guidance itself. Open: how often to re-classify, and what to show on low confidence (leaning toward nothing over a wrong topic).

#### App registration status

- **The app has NOT been created yet** (confirmed 2026-10-27). The form was only explored. A draft name of `sgMontiPhone` was considered. The form was previewed with Client-side web app (SPA) with PKCE, then Server-side web app, which is the intended choice.
- To confirm when creating the app: refresh tokens = Yes, scopes (VoIP calling needed for the web phone, nothing else until a spike needs it), sandbox or production environment.

#### Open questions

- Do the web phone and the desktop app coexist on one extension? Does an incoming call ring both? (Spike 1 tests this.)
- Does our RingEX plan allow a browser phone device and the required scopes?
- Does the form accept an `http://localhost` redirect URI?
- Consent rules for AI listening on customer calls (compliance, not engineering).
- Current state of the Web Phone SDK and how it exposes its media objects.
- Transcription vendor choice and its audio retention terms.

#### Planned spikes

1. Web phone page with a level meter per audio track. Also tests coexistence with the desktop app.
2. Stream both tracks to a transcription vendor and print a speaker-labelled transcript.
3. Topic classification with a few hand-written topics against a fixed transcript.
4. Mongo topic module (use the `data-module` skill once the shape is settled).

Note: the RingCX scaffold under `_lib/` and `api/webhooks/` is unrelated to this work and stays parked.