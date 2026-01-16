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
