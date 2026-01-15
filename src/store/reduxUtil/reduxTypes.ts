export interface ThunkConfig {
  showLoading?: boolean;
  loadingMsg?: string;
  force?: boolean;
  //milliseconds
  staleTime?: number;
}

// Helper to easily add UI args to your payload types
export type WithConfig<T> = T & ThunkConfig;
