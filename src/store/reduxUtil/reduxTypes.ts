export type ThunkConfig = {
  showLoading?: boolean;
  loadingMsg?: string;
  force?: boolean;
  //milliseconds
  staleTime?: number;
  // Suppress error toasts
  silentError?: boolean;
};

// Helper to easily add UI args to your payload types
// Separates config from data to prevent leakage
export type WithConfig<T> = {
  config?: ThunkConfig;
  params: T;
};
