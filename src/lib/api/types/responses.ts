export type ErrorResponse<T = unknown> = {
  success: false;
  message: string;
  data?: T;
  silent?: boolean;
  code?: number;
};
export type SuccessResponse = { success: true };
export type ObjResponse<T> = SuccessResponse & { item: T };
export type ArrayResponse<T> = SuccessResponse & { items: T[] };

export type ApiResponse<T> =
  | ObjResponse<T>
  | ArrayResponse<T>
  | SuccessResponse
  | ErrorResponse<T>;
