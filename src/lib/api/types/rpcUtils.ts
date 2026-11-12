import { Role } from "@/lib/api/types/roles";
import type { CapabilityRequirement } from "@/permission/PermissionTypes";

/**
 * 1. OpMap
 * Generates the Request Body Union (e.g., { op: 'getAll', ...params } | { op: 'save', ... })
 * We removed the 'extends Record' constraint to support Interfaces.
 */
export type OpMap<T> = {
  [K in keyof T]: T[K] extends { params: infer P } ? { op: K } & P : never;
}[keyof T];

/**
 * 2. HandlerMap
 * Enforces that every operation in the contract has a 'handler' and exactly one gate.
 * Handlers can return the Result type R OR a ReadableStream for streaming responses.
 */
/**
 * The gate on an op: the old `roles`, or the new `capability`, never both and never neither.
 * Migration: ops move from `roles` to `capability` route by route. When the last one has moved,
 * the `roles` variant is deleted, which makes `capability` required and lets the compiler list
 * any op that was missed.
 */
export type OpGate =
  | { roles: Role[]; capability?: never }
  | { capability: CapabilityRequirement; roles?: never };

export type HandlerMap<T> = {
  [K in keyof T]: T[K] extends { params: infer P; result: infer R }
    ? OpGate & {
        handler: (params: P) => Promise<R | ReadableStream>;
      }
    : never;
};
