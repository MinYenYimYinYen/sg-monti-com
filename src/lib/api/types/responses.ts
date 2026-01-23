export type ErrorResponse<T = unknown> = {
  success: false;
  message: string;
  data?: T;
  silent?: boolean;
  code?: number;
};
export type SuccessResponse = { success: true };

export type DataResponse<T> = SuccessResponse & { payload: T };

export type ApiResponse<T> =
  | DataResponse<T>
  | SuccessResponse
  | ErrorResponse<T>;
