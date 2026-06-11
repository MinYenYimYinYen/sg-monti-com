\xEF\xBB\xBF# Javelin — Account Handling & Refund Flow

This document explains how the Deposit and General Ledger flows handle refunds. The workflow is a two-step process that can look confusing at first glance, so both a user-facing and developer-facing explanation are provided below.

---

## For Users

### What is the Deposit Journal Entry?

When you upload a deposit CSV, Javelin generates one QuickBooks journal entry per deposit date. Each entry has up to four lines:

| Field | Side | Account (example) | Why |
|---|---|---|---|
| Sales Amount | **Credit** | SA Payments:Credit Card Payments | Money collected from customers |
| Refund Amount | **Debit** | Accounts Receivable | See below |
| Fees | **Debit** | Expenses – Administrative:Bank Services | Processing cost |
| Net Deposit | **Debit** | SSB Checking | Cash that actually hit the bank |

The entry always balances: Debits = Credits.

---

### Why Does a Refund Go to Accounts Receivable as a Debit?

A refund means the credit card processor sent money *back* to a customer — so that money never made it into your bank account. The deposit journal needs to account for where that money went.

Debiting **Accounts Receivable** is a holding entry. It says: *"We paid this customer back. That balance now needs to be resolved."*

There are two ways it gets resolved, depending on the situation:

#### Scenario 1 — The customer had a credit balance (overpayment)

The customer overpaid at some point and had a credit sitting on their account. When you issue the refund, the A/R debit from the deposit entry simply offsets that existing credit balance. The books are clean — no further action needed.

#### Scenario 2 — The customer is getting a write-off (dissatisfaction, etc.)

The customer didn't overpay; you're refunding them as a goodwill gesture or due to a service issue. After the deposit entry posts the A/R debit, the CRM records a separate adjustment (a write-off or credit memo). That adjustment flows through the **General Ledger** export as its own entry:

- **Credit A/R** — clears the balance that was put there by the deposit entry
- **Debit Adjustments** (or similar) — records the expense/loss

So the full picture across both steps is:

```
Step 1 (Deposit):     Debit  A/R              $466.98
Step 2 (Gen Ledger):  Credit A/R              $466.98
                      Debit  Adjustments      $466.98
```

The A/R balance nets to zero. The Adjustments account carries the cost.

---

### What Should I Map the Refund Amount To?

Map **Refund Amount** to your **Accounts Receivable** account. This is correct in both scenarios above. Do not map it to a revenue or expense account directly — the two-step process handles the final classification through the Gen Ledger adjustment.

---

## For Developers

### `FIELD_NATURAL_SIDE` — Why `refundAmount` is `"debit"`

Both `depositSelect.ts` and `depositTransform.ts` define:

```ts
const FIELD_NATURAL_SIDE: Record<DepositField, "debit" | "credit"> = {
  salesAmount: "credit",
  refundAmount: "debit",   // intentional — see below
  chargeBackAmount: "debit",
  adjustmentAmount: "debit",
  fees: "debit",
  netDeposit: "debit",
};
```

`refundAmount: "debit"` is **intentional and correct**. It is not a mistake. The refund is a holding entry to A/R, not a direct offset to revenue. The accounting is completed in a second step via the Gen Ledger export (see user section above).

If this were changed to `"credit"`, the refund would offset the Sales credit — which would be wrong because the CRM's two-step process would then double-count the write-off when the Gen Ledger adjustment also credits A/R.

### Balance Check

The balance validator in `depositSelect.ts` (`computeRowBalance`) checks that total debits equal total credits for each row. It does **not** validate whether each line is on the semantically correct side — that is by design. The balance check is a sanity guard against parsing errors, not an accounting policy enforcer.

For the example in the screenshot:

```
Credits:  Sales $4,292.29
Debits:   Refund $466.98 + Fees $126.20 + Net Deposit $3,699.11 = $4,292.29  ✓
```

### Relationship Between the Two Flows

| Flow | File | Handles |
|---|---|---|
| Deposit | `depositTransform.ts`, `depositSlice.ts`, `depositSelect.ts` | Credit card batch deposit → QB journal entry |
| Gen Ledger | `genLedgerTransform.ts`, `javelinSlice.ts`, `javelinSelect.ts` | CRM general ledger export → QB journal entry |

The two flows are independent Redux slices and independent CSV exports. They are linked only by the accounting workflow: the Deposit flow creates an A/R debit for refunds, and the Gen Ledger flow (when a write-off adjustment exists in the CRM) creates the corresponding A/R credit that clears it.
