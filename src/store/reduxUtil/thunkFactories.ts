import { createAsyncThunk } from "@reduxjs/toolkit";
import { AppDispatch, AppState } from "@/store";
import { WithConfig } from "@/store/reduxUtil/reduxTypes";
import { smartThunkOptions } from "@/store/reduxUtil/smartThunkOptions";
import { api, apiStream } from "@/lib/api/api";
import { DataResponse } from "@/lib/api/types/responses";
import { OpMap } from "@/lib/api/types/rpcUtils";
import { handleError } from "@/lib/errors/errorHandler";
import { AppError } from "@/lib/errors/AppError";
import { readNdjsonStream } from "@/lib/api/streamUtils";

type StandardThunkConfig<TParams> = {
  typePrefix: string;
  apiPath: string;
  opName: string;
  // Optional: Custom condition logic
  customCondition?: (
    arg: WithConfig<TParams>,
    api: { getState: () => unknown },
  ) => boolean;
  // Optional: Transform params before sending to API
  transformParams?: (
    params: TParams,
    getState: () => unknown,
  ) => TParams;
  // Optional: Enable debug logging
  debug?: boolean;
};

export function createStandardThunk<
  TContract,
  TOp extends keyof TContract,
  TParams = TContract[TOp] extends { params: infer P } ? P : never,
  TResult = TContract[TOp] extends { result: { payload: infer R } } ? R : never,
>(config: StandardThunkConfig<TParams>) {
  return createAsyncThunk<
    TResult,
    WithConfig<TParams>,
    { rejectValue: string; state: AppState }
  >(
    config.typePrefix,
    async (arg, { rejectWithValue }) => {
      try {
        // Use cached transformed params if available (set by condition), otherwise use original
        const finalParams = arg.__transformedParams ?? arg.params;

        if (config.debug) {
          console.log(`[${config.typePrefix}] Payload Creator:`, {
            originalParams: arg.params,
            transformedParams: arg.__transformedParams,
            finalParams,
          });
        }

        const body: OpMap<TContract> = {
          op: config.opName,
          ...finalParams,
        } as any;

        // api() now returns DataResponse<TResult> | ErrorResponse
        // It does NOT throw for handled errors (success: false)
        const res = await api<DataResponse<TResult>>(config.apiPath, {
          method: "POST",
          body,
        });

        // Path A: Soft Error (Handled by Server)
        if (!res.success) {
          const error = new AppError({
            message: res.message,
            type: "API_ERROR",
            isOperational: true,
            silent: res.silent,
            code: res.code,
          });

          // Client Override wins
          const isSilent = arg.config?.silentError ?? error.silent;
          handleError(error, { silent: isSilent });

          return rejectWithValue(res.message);
        }

        // Path B: Success
        return res.payload;
      } catch (e) {
        // Path C: Hard Error (Network / Crash)
        const isSilent = arg.config?.silentError;
        const error = handleError(e, { silent: isSilent });
        return rejectWithValue(error.message);
      }
    },
    smartThunkOptions({
      typePrefix: config.typePrefix,
      customCondition: config.customCondition as any,
      transformParams: config.transformParams,
      debug: config.debug,
    }),
  );
}

type StreamThunkConfig<TParams, TChunk> = {
  typePrefix: string;
  apiPath: string;
  opName: string;
  onChunk: (dispatch: AppDispatch, chunk: TChunk) => void;
};

export function createStreamThunk<
  TContract,
  TOp extends keyof TContract,
  TParams = TContract[TOp] extends { params: infer P } ? P : never,
  TChunk = TContract[TOp] extends { result: { payload: Array<infer C> } }
    ? C
    : never,
>(config: StreamThunkConfig<TParams, TChunk>) {
  return createAsyncThunk<
    void,
    WithConfig<TParams>,
    { rejectValue: string; state: AppState }
  >(
    config.typePrefix,
    async (arg, { dispatch, rejectWithValue }) => {
      try {
        const body: OpMap<TContract> = {
          op: config.opName,
          ...arg.params,
        } as any;

        // apiStream still throws on error because it returns a Reader
        const reader = await apiStream(config.apiPath, {
          method: "POST",
          body,
        });

        await readNdjsonStream<TChunk>(reader, (chunk) => {
          config.onChunk(dispatch as AppDispatch, chunk);
        });

        return;
      } catch (e) {
        const isSilent = arg.config?.silentError;
        const error = handleError(e, { silent: isSilent });
        return rejectWithValue(error.message);
      }
    },
    smartThunkOptions({ typePrefix: config.typePrefix }),
  );
}
