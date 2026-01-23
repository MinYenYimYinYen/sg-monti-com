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
    async ({ params, config: thunkConfig }, { rejectWithValue }) => {
      try {
        const body: OpMap<TContract> = {
          op: config.opName,
          ...params,
        } as any;

        const res = await api<DataResponse<TResult>>(config.apiPath, {
          method: "POST",
          body,
        });

        // Path A: Soft Error
        if (!res.success) {
          const error = new AppError({
            message: res.message,
            type: "API_ERROR",
            isOperational: true,
            silent: res.silent,
            code: res.code,
          });

          // Client Override wins
          const isSilent = thunkConfig?.silentError ?? error.silent;
          handleError(error, { silent: isSilent });

          return rejectWithValue(res.message);
        }

        // Path B: Success
        return res.payload;
      } catch (e) {
        // Path C: Hard Error
        const isSilent = thunkConfig?.silentError;
        const error = handleError(e, { silent: isSilent });
        return rejectWithValue(error.message);
      }
    },
    smartThunkOptions({
      typePrefix: config.typePrefix,
      customCondition: config.customCondition as any,
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
    async ({ params, config: thunkConfig }, { dispatch, rejectWithValue }) => {
      try {
        const body: OpMap<TContract> = {
          op: config.opName,
          ...params,
        } as any;

        const reader = await apiStream(config.apiPath, {
          method: "POST",
          body,
        });

        await readNdjsonStream<TChunk>(reader, (chunk) => {
          config.onChunk(dispatch, chunk);
        });

        return;
      } catch (e) {
        const isSilent = thunkConfig?.silentError;
        const error = handleError(e, { silent: isSilent });
        return rejectWithValue(error.message);
      }
    },
    smartThunkOptions({ typePrefix: config.typePrefix }),
  );
}
