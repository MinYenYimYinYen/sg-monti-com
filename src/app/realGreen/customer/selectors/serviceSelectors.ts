import {AppState} from "@/store";

const selectSlice = (slice: keyof AppState) => (state: AppState) => state[slice];