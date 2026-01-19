import { ObjResponse, SuccessResponse } from "@/lib/api/types/responses";
import { User, UserWithPW } from "@/app/auth/_types/User";
import { CheckedId } from "@/app/auth/_types/authTypes";
import { PasswordResetRequest } from "@/app/auth/_types/PasswordResetRequest";
import { Role } from "@/lib/api/types/roles";
import { ApiContract } from "@/lib/api/types/ApiContract";
import {PendingAdminActions} from "@/app/auth/authSlice";

export interface AuthContract extends ApiContract {
  // 1. Check if they CAN register (RealGreen Check)
  checkEligibility: {
    params: {
      saId: string; // Matching User type
    };
    result: ObjResponse<CheckedId>;
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

  // 9. Get Pending Actions (Admin)
  getPendingActions: {
    params: {};
    result: ObjResponse<PendingAdminActions>;
  };

  // 10. Approve User (Admin)
  approveUser: {
    params: {
      userName: string;
      role: Role;
    };
    result: SuccessResponse;
  };

  // 11. Change Password (Authenticated User)
  changePassword: {
    params: {
      newPassword: string;
    };
    result: SuccessResponse;
  };
}
