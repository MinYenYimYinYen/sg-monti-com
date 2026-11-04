import { createRpcHandler } from "@/lib/api/createRpcHandler";
import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { ApiContract } from "@/lib/api/types/ApiContract";

/**
 * QBO-aware RPC handler factory. All QuickBooks route.ts files use this instead of
 * createRpcHandler, like createRealGreenRpcHandler.
 *
 * For now it only delegates. It exists as the seam for the per-call QBO API log (capture
 * `intuit_tid` into an AsyncLocalStorage list, then write it with one awaited insertMany in a
 * finally block). See "Logging" in planning/qboPlan.md. Routes already use it, so adding the
 * log later changes no route.
 */
export function createQboRpcHandler<T extends ApiContract>(handlers: HandlerMap<T>) {
  return createRpcHandler(handlers);
}
