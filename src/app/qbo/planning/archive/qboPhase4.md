# QBO Integration - Phase 4: Inline Vendor Creation

## Goal

Let the user create a new QBO vendor from the import screen when a merchant has no match, without leaving the flow.

## Design

- Write op `createVendor` (office/admin). Our type in, `remapVendorWrite` converts to QBO's `Vendor` create shape at the boundary. The QBO type is built inside the remap function and passed straight to the HTTP layer (type-boundary rule).
- Minimal fields: `DisplayName` only. We are not building vendor management.
- Batch items are independent (a vendor created in a batch is NOT available to a purchase in the same batch). So vendors are created before purchases are posted. During import the user may queue new vendors; they are created as step 1 of posting (Phase 6). A standalone create is also fine for immediate use.
- Duplicate names: QBO rejects a duplicate `DisplayName` (error code 6240, ValidationFault; the name must be unique across vendors, customers and employees). On 6240, look up the existing vendor by `DisplayName` and offer to map to it instead.
- Names that collide with a customer or employee (not a vendor) cannot be mapped as a vendor. Detect and tell the user to pick a different name.
- After create, upsert the new vendor into the Mongo mirror and return it so the mapping can point at its `qboId`.
- Name hygiene: trim, collapse whitespace, enforce QBO's length limit (verify in sandbox).

## Your Tasks

- [ ] Decide on naming conventions for new vendors (for example `Amazon` rather than `AMAZON MKTPL*...`).
- [ ] Try creating a duplicate vendor name in the sandbox and confirm the behavior we handle.

## Our Tasks

- [ ] `createVendor` contract op, handler and `remapVendorWrite`
- [ ] 6240 handling with existing-vendor lookup
- [ ] Mirror upsert after create
- [ ] Hook action and UI for create-in-place

## Done Criteria

- [ ] New vendor created in the sandbox and mirrored.
- [ ] Duplicate name produces a friendly map-to-existing offer.
- [ ] Reminder: run `npx tsc --noEmit` after this phase.