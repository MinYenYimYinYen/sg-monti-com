export type ErrorResponse<T = unknown> = {
  success: false;
  message: string;
  data?: T;
  silent?: boolean;
  code?: number;
};
export type SuccessResponse = { success: true };

/**
 * @deprecated Use DataResponse<T> instead.
 */
export type ObjResponse<T> = SuccessResponse & { item: T };

/**
 * @deprecated Use DataResponse<T[]> instead.
 */
export type ArrayResponse<T> = SuccessResponse & { items: T[] };

export type DataResponse<T> = SuccessResponse & { payload: T };

export type ApiResponse<T> =
  | DataResponse<T>
  | ObjResponse<T>
  | ArrayResponse<T>
  | SuccessResponse
  | ErrorResponse<T>;
