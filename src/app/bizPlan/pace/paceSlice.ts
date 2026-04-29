import { TRange } from "@/lib/primatives/tRange/TRange";
import { dateStrings } from "@/lib/primatives/dates/dateStrings";

type PaceState = {
  selectedDateRange: TRange<string>;
};

const initialState: PaceState = {
  selectedDateRange: dateStrings.padDateRange(
    {
      min: dateStrings.today(),
      max: dateStrings.today(),
    },
    14,
  ),
};

const paceSlice = createSlice({
  name: "pace",
  initialState,
  reducers: {
    setSelectedDateRange: (state, action: PayloadAction<TRange<string>>) => {
      state.selectedDateRange = action.payload;
    },
  },
});

export const paceActions = { ...paceSlice.actions };
export const paceReducer = paceSlice.reducer;
