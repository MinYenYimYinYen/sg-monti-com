import { createRpcHandler } from "@/lib/api/createRpcHandler";
import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { ApiContract } from "@/lib/api/types/ApiContract";
import { rgCallMapStorage } from "@/app/realGreen/_lib/api/rgHttp";
import { logRgApiOperation } from "@/app/realGreen/rgApiLog/rgApiLogFunc";

/**
 * RealGreen-aware RPC handler factory.
 *
 * Wraps createRpcHandler with per-operation RealGreen API call logging using
 * AsyncLocalStorage for request-scoped isolation. Each handler execution runs
 * inside its own AsyncLocalStorage context, so concurrent operations (even in
 * dev mode with a shared Node.js process) cannot bleed call counts into each other.
 *
 * All RealGreen route.ts files should use this instead of createRpcHandler.
 */
export function createRealGreenRpcHandler<T extends ApiContract>(
  handlers: HandlerMap<T>,
) {
  const wrappedHandlers = Object.fromEntries(
    Object.entries(handlers).map(([op, config]) => {
      const { handler, ...rest } = config as { handler: (params: any) => Promise<any>; [key: string]: any };
      return [
        op,
        {
          ...rest,
          handler: async (params: any) => {
            const callMap = new Map<string, number>();
            const startMs = Date.now();

            const result = await rgCallMapStorage.run(callMap, () => handler(params));

            await logRgApiOperation({
              operation: op,
              callsByEndpoint: Object.fromEntries(callMap),
              durationMs: Date.now() - startMs,
            });

            return result;
          },
        },
      ];
    }),
  ) as HandlerMap<T>;

  return createRpcHandler(wrappedHandlers);
}
