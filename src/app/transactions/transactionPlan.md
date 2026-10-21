# Transaction Import Portal — Plan

## Project Objective

Build a custom internal web application to automate and segregate credit card transaction imports from **Capital One Business** and **Chase Visa** into **QuickBooks Online**.

This portal allows individual cardholders to categorize their own transactions prior to synchronization, replacing the standard QuickBooks bank feed limitations and bypassing the manual CSV upload method.

---

## Data Ingestion Strategy (Credit Card APIs)

Capital One and Chase do not provide direct, public-facing APIs for individual businesses to pull their own statements. Data ingestion will be routed through an **Open Banking Data Aggregator**.

| Concern | Detail |
|---|---|
| **Provider** | [Plaid](https://plaid.com) — recommended standard for this architecture |
| **Authentication** | Frontend uses **Plaid Link** to facilitate a secure OAuth connection directly to the financial institutions |
| **Data Retrieval** | Backend calls the **Plaid API** to fetch JSON transaction payloads; account metadata automatically segregates transactions by cardholder in the UI |

---

## Data Export Strategy (QuickBooks Online API)

Data is programmatically exported to QuickBooks Online via the **Intuit Accounting API**, eliminating manual file transfers.

| Concern | Detail |
|---|---|
| **Authentication** | Intuit **OAuth 2.0** authorizes modifications to the specific QBO company file |
| **Transaction Syncing** | After a user categorizes a transaction in the UI, the backend POSTs to the QBO `/purchase` endpoint, mapping `amount`, `date`, and the user-selected category (`AccountRef`) |
| **Entity Tagging** | Expenditures can be further organized by passing employee identifiers into `CustomerRef`, `ClassRef`, or `DepartmentRef` fields in the payload |

---

## Technology Stack & Database Architecture

The application is structured around a **Next.js App Router** environment using **MongoDB** to manage state and relational mapping.

### Frontend — React / Next.js
- Manages the transaction categorization UI
- Integrates `react-plaid-link` for initial bank authentication

### Backend — Next.js API Routes
- `route.ts` files securely execute the `plaid` and `intuit-oauth` Node.js SDKs
- Sensitive client secrets are never exposed to the browser

### Database — MongoDB

**`QBOAuth` schema** — QBO Token Management
- Stores the Intuit `realmId` and the active OAuth token object
- Enables seamless background refresh token rotation without requiring repeated browser authentication

**`CardholderMapping` schema** — Cardholder Mapping
- Links the Plaid `accountId` to the internal application user
- Stores the specific QuickBooks tracking entities (`qboCreditCardAccountRef`, `qboClassRef`)
- Ensures every transaction is routed accurately to the correct cardholder and GL account
