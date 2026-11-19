export type ErrorResponse<T = unknown> = {
  success: false;
  message: string;
  data?: T;
  silent?: boolean;
  code?: number;
  /** Set only on a 403: the capability the caller lacked. */
  required?: string;
};
export type SuccessResponse = { success: true; partialError?: string };

export type DataResponse<T> = SuccessResponse & { payload: T };

export type ApiResponse<T> =
  | DataResponse<T>
  | SuccessResponse
  | ErrorResponse<T>;
