# Javelin — Account Handling & Refund Flow

This document explains how the Deposit and General Ledger flows handle refunds. The workflow is a two-step process that can look confusing at first glance, so both a user-facing and developer-facing explanation are provided below.

---

## For Users

### What is the Deposit Journal Entry?

When you upload a deposit CSV, Javelin generates one QuickBooks journal entry per deposit date. Each entry has up to four lines:

| Field | Side | Account (example) | Why |
|---|---|---|---|
| Sales Amount | **Credit** | SA Payments:Credit Card Payments | Money collected from customers |
| Refund Amount | **Debit** | SA Payments:Credit Card Payments | See below |
| Fees | **Debit** | Expenses – Administrative:Bank Services | Processing cost |
| Net Deposit | **Debit** | SSB Checking | Cash that actually hit the bank |

The entry always balances: Debits = Credits.

---

### Why Does the Refund Use the Same Account as Sales?

A refund means the credit card processor clawed back money from your deposit — it never reached your bank account. From the processor's perspective, the refund reduces the amount they owe you, which is tracked in **Credit Card Payments** (the same account that sales flow into).

So the deposit entry debits Credit Card Payments to reduce that balance, exactly offsetting the credit that the sale originally created.

**Important:** Do **not** map Refund Amount to Accounts Receivable in the deposit flow. That is handled separately by the CRM's General Ledger export (see below).

---

### The Two-Step Refund Process

The full refund workflow spans both Javelin flows:

**Step 1 — Deposit flow** (records what happened at the processor):
```
Credit  Credit Card Payments   $466.98   ← from Sales Amount
Debit   Credit Card Payments   $466.98   ← from Refund Amount (nets to zero in this account)
Debit   Fees                   $126.20
Debit   SSB Checking           $3,699.11
```

**Step 2 — Gen Ledger flow** (records what happened in the CRM):
```
Debit   Accounts Receivable    $466.98   ← customer now owes again (or credit balance is cleared)
Credit  Credit Card Payments   $466.98   ← processor-side liability is reduced
```

The two steps together correctly reflect the full picture: the processor paid the customer back, and the CRM tracks the resulting customer balance.

#### Scenario A — The customer had a credit balance (overpayment)

The A/R debit from the Gen Ledger entry offsets the existing credit balance on the customer's account. No further action needed.

#### Scenario B — The customer is getting a write-off (dissatisfaction, etc.)

A separate adjustment is recorded in the CRM (write-off or credit memo), which flows through the Gen Ledger as an additional entry:
```
Credit  Accounts Receivable    $466.98   ← clears the balance from Step 2
Debit   Adjustments            $466.98   ← records the expense/loss
```

---

### What Should I Map the Refund Amount To?

Map **Refund Amount** to the **same Credit Card Payments account as Sales Amount**. This is correct in all scenarios. The CRM's Gen Ledger export handles the A/R side of the transaction separately.

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

`refundAmount: "debit"` is **intentional and correct**. The refund reduces the Credit Card Payments balance (the same account that sales credit into), so it goes on the debit side of that account.

### Why NOT Accounts Receivable for the Deposit Flow?

It may be tempting to map Refund Amount to A/R in the deposit flow, but this causes a double-hit:

- The **Gen Ledger flow** already debits A/R when the CRM records the refund.
- If the **Deposit flow** also debits A/R, A/R is overstated by the refund amount — exactly the balance sheet discrepancy you would observe.

The deposit flow's responsibility is to record the **processor-level** transaction (what hit or didn't hit the bank). The CRM-level transaction (what happened to the customer's balance) is the Gen Ledger flow's responsibility. These two flows must use different accounts for the refund line to avoid double-counting.

### Full Account Flow (Net Effect)

| Account | Deposit Flow | Gen Ledger Flow | Net |
|---|---|---|---|
| Credit Card Payments | +$4,292.29 credit (sales) − $466.98 debit (refund) | − $466.98 credit | Net credit = $3,358.31 (net sales after refund, before gen ledger offset) |
| Accounts Receivable | — | + $466.98 debit | Resolved by customer credit balance or write-off adjustment |
| SSB Checking | + $3,699.11 debit | — | Actual cash deposited |
| Fees | + $126.20 debit | — | Processing cost |

### Balance Check

The balance validator in `depositSelect.ts` (`computeRowBalance`) checks that total debits equal total credits for each row. It does **not** validate whether each line is on the semantically correct side — that is by design. The balance check is a sanity guard against parsing errors, not an accounting policy enforcer.

For the example in the screenshot:

```
Credits:  Sales $4,292.29
Debits:   Refund $466.98 + Fees $126.20 + Net Deposit $3,699.11 = $4,292.29  ✓
```

### Relationship Between the Two Flows

| Flow | Files | Handles |
|---|---|---|
| Deposit | `depositTransform.ts`, `depositSlice.ts`, `depositSelect.ts` | Credit card batch deposit → QB journal entry (processor-level) |
| Gen Ledger | `genLedgerTransform.ts`, `javelinSlice.ts`, `javelinSelect.ts` | CRM general ledger export → QB journal entry (CRM-level) |

The two flows are independent Redux slices and independent CSV exports. They are linked only by the accounting workflow: the Deposit flow records the processor's view of the refund (debit Credit Card Payments), and the Gen Ledger flow records the CRM's view (debit A/R, credit Credit Card Payments).
