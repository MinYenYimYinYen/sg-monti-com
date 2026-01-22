import { Role } from "@/lib/api/types/roles";

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
 * Enforces that every operation in the contract has a 'handler' and 'roles'.
 * Handlers can return the Result type R OR a ReadableStream for streaming responses.
 */
export type HandlerMap<T> = {
  [K in keyof T]: T[K] extends { params: infer P; result: infer R }
    ? {
        roles: Role[];
        handler: (params: P) => Promise<R | ReadableStream>;
      }
    : never;
};
