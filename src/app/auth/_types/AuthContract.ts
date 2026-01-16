import { ObjResponse, SuccessResponse } from "@/lib/api/types/responses";
import { User, UserWithPW } from "@/app/auth/_types/User";
import { CheckedId } from "@/app/auth/_types/authTypes";

export interface AuthContract {
  // 1. Check if they CAN register (RealGreen Check)
  checkEligibility: {
    params: {
      saId: string; // Matching User type
      email: string;
    };
    result: SuccessResponse & CheckedId;
  };

  // 2. Create the account
  register: {
    params: UserWithPW; // Full payload including password
    result: ObjResponse<User>; // Return safe user (no password)
  };

  // 3. Login
  login: {
    params: {
      userName: string; // Matching User type
      password: string;
    };
    result: ObjResponse<User>; // Return safe user
  };

  // 4. Logout
  logout: {
    params: {};
    result: SuccessResponse;
  };

  // 5. Refresh Token
  refresh: {
    params: {};
    result: SuccessResponse;
  };

  // 6. Check Auth (Session Restoration)
  checkAuth: {
    params: {};
    result: ObjResponse<User>;
  };

  // 7. Request Password Reset (Public)
  requestPasswordReset: {
    params: {
      userName: string;
    };
    result: SuccessResponse;
  };

  // 8. Resolve Password Reset (Admin)
  resolvePasswordReset: {
    params: {
      userName: string; // Natural Key
      tempPassword: string;
    };
    result: SuccessResponse;
  };
}
