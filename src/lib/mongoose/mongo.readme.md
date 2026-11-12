# Mongoose & Data Modeling Guidelines

This project follows strict conventions for data modeling to ensure type safety, consistency, and separation of concerns.

## 1. Type-Driven Development
*   **Single Source of Truth**: Every Mongoose Model must be based on a TypeScript `interface` or `type` defined in a separate file (usually in `_types/`).
*   **Separation**: Never define the DTO (Data Transfer Object) type in the same file as the Mongoose Model. This prevents circular dependencies between Client (which needs the Type) and Server (which needs the Model).

## 2. No Mongoose IDs (`_id`) in Application Logic
*   **Natural Keys**: Application logic, API Contracts, and Frontend components should rely on **Natural Keys** (e.g., `userName`, `saId`, `invoiceNumber`) rather than Mongoose's auto-generated `_id`.
*   **Sanitization**: API routes must strip `_id` and `__v` before returning objects to the client. Use `cleanMongoObject` or `cleanMongoArray`.
*   **Indexing**: If performance is a concern, create indexes on the Natural Keys.

## 3. Date Handling
*   **Strings Only**: All dates must be stored and transmitted as **Strings** (ISO 8601 format preferred).
*   **Reasoning**: This avoids timezone complexity and serialization issues between Server (Node.js Date) and Client (Browser Date).
*   **Type**: Use the `CreatedUpdated` type from `@/lib/mongoose/mongooseTypes` which defines `createdAt` and `updatedAt` as strings.

## 4. Records That Reference a Person
A superuser can delete a user (`deleteUser` in `src/app/auth/api/route.ts`). Every record that names a person has to be one of the kinds below, so a new module decides this when it is built.

| Kind | Examples | Key | When the user is deleted |
|---|---|---|---|
| Access or identity | capabilities, pending password resets | `userName` | Deleted, in the `deleteUser` handler or `deleteUserReferences` |
| Responsibility or assignment | credit card assignments | `userName` | Deleted, so the thing is unassigned and gets assigned again |
| Authored shared content | form templates, prepay configs, upsell priorities, quick-send templates | `saId` | Kept |
| History | who imported or posted, inventory checks | `saId` for new records | Kept |

*   **The test**: a record that is still useful to the team without the person stays, and carries `saId`. A record that only works with a login carries `userName` and is deleted with the user.
*   **Why `saId`**: it is the employee's id in RealGreen, so it identifies the person and outlives their login. If the same person registers again, their templates and configs are still theirs.
*   **Responsibility records are deleted, not kept**: a card assignment left behind would still count as assigned (the import check looks for an assignment, not for its user), so imports would go through with a card nobody owns and a blank cardholder name.
*   **Adding a module that saves a document for a user**: decide which row it is and say so in its Types file. If it is a "deleted" row, add it to `deleteUserReferences` (`src/app/auth/_lib/deleteUserReferences.ts`) and give its slice a `deleteUser.fulfilled` case that drops the same records from state, as `importCCTxnMappingSlice` does.
*   **Known drift (not migrated)**: these history fields store `userName`: `importedByUserName` and `postedByUserName` (QBO import rows), `postedByUserName` (journal postings), `connectedByUserName` (QBO connection) and `createdBy` (inventory checks). They are correctly kept on delete. New history records should use `saId`.

## Example Pattern

**1. The Type (`src/features/users/_types/User.ts`)**
```typescript
export interface User {
  userName: string; // Natural Key
  email: string;
  role: "admin" | "user";
}
```

**2. The Model (`src/features/users/_models/UserModel.ts`)**
```typescript
import { User } from "../_types/User";
import { CreatedUpdated } from "@/lib/mongoose/mongooseTypes";

// Doc extends the Type + Mongoose Document
export interface UserDoc extends User, CreatedUpdated, mongoose.Document {}

const UserSchema = new mongoose.Schema({
  userName: { type: String, required: true, unique: true }, // Unique Index
  // ...
}, { timestamps: true });

// ... export Model
```
