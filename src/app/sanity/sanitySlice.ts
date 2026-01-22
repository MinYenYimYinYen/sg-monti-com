import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { AppState } from "@/store";
import { WithConfig } from "@/store/reduxUtil/reduxTypes";
import { smartThunkOptions } from "@/store/reduxUtil/smartThunkOptions";
import {
  CustomerContract,
  StreamChunk,
} from "@/app/realGreen/customer/_lib/types/CustomerContract";
import { OpMap } from "@/lib/api/types/rpcUtils";
import { handleError } from "@/lib/errors/errorHandler";
import { apiStream } from "@/lib/api/api";
import { CustomerDoc } from "@/app/realGreen/customer/_lib/types/Customer";
import { ProgramDoc } from "@/app/realGreen/customer/_lib/types/Program";
import { ServiceDoc } from "@/app/realGreen/customer/_lib/types/Service";

interface SanityState {
  dryCustomers: CustomerDoc[];
  dryPrograms: ProgramDoc[];
  dryServices: ServiceDoc[];
}

const initialState: SanityState = {
  dryCustomers: [],
  dryPrograms: [],
  dryServices: [],
};

const sanitySlice = createSlice({
  name: "sanity",
  initialState,
  reducers: {
    clearDocs(state) {
      state.dryCustomers = [];
      state.dryPrograms = [];
      state.dryServices = [];
    },
    receiveChunk(state, action: PayloadAction<StreamChunk>) {
      const { stepName, data } = action.payload;

      if (stepName === "customers" && data.dryCustomers) {
        state.dryCustomers.push(...data.dryCustomers);
      } else if (stepName === "programs" && data.dryPrograms) {
        state.dryPrograms.push(...data.dryPrograms);
      } else if (stepName === "services" && data.dryServices) {
        state.dryServices.push(...data.dryServices);
      }
    },
  },
});

export const getDocs = createAsyncThunk<
  void,
  WithConfig<CustomerContract["runSearchScheme"]["params"]>,
  { rejectValue: string; state: AppState }
>(
  "sanity/getDocs",
  async (params, { dispatch, rejectWithValue }) => {
    try {
      const { params: apiParams } = params;
      const body: OpMap<CustomerContract> = {
        op: "runSearchScheme",
        ...apiParams,
      };

      // Use the new apiStream wrapper (handles Auth & Errors)
      const reader = await apiStream("/realGreen/customer/api", {
        method: "POST",
        body,
      });

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Handle NDJSON (Newline Delimited JSON)
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // Keep the last incomplete line in buffer

        for (const line of lines) {
          if (line.trim()) {
            try {
              const chunk: StreamChunk = JSON.parse(line);
              // DISPATCH INCREMENTAL UPDATE
              dispatch(sanitySlice.actions.receiveChunk(chunk));
            } catch (parseError) {
              console.error("Failed to parse chunk", parseError);
            }
          }
        }
      }

      return;
    } catch (e) {
      const error = handleError(e);
      return rejectWithValue(error.message);
    }
  },
  smartThunkOptions({ typePrefix: "sanity/getDocs" }),
);

export const { clearDocs, receiveChunk } = sanitySlice.actions;
export default sanitySlice.reducer;
