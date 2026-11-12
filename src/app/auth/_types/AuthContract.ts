import { DataResponse } from "@/lib/api/types/responses";
import { User, UserWithPW } from "@/app/auth/_types/User";
import { CheckedId } from "@/app/auth/_types/authTypes";
import { Role } from "@/lib/api/types/roles";
import { ApiContract } from "@/lib/api/types/ApiContract";
import { PendingAdminActions } from "@/app/auth/authSlice";

export interface AuthContract extends ApiContract {
  // 1. Check if they CAN register (RealGreen Check)
  checkEligibility: {
    params: {
      saId: string; // Matching User type
    };
    result: DataResponse<CheckedId>;
  };

  // 2. Create the user
  register: {
    params: UserWithPW; // Full payload including password
    result: DataResponse<User>; // Return safe user (no password)
  };

  // 3. Login
  login: {
    params: {
      userName: string; // Matching User type
      password: string;
    };
    result: DataResponse<User>; // Return safe user
  };

  // 4. Logout
  logout: {
    params: {};
    result: DataResponse<null>;
  };

  // 5. Refresh Token
  refresh: {
    params: {};
    result: DataResponse<null>;
  };

  // 6. Check Auth (Session Restoration)
  checkAuth: {
    params: {};
    result: DataResponse<User>;
  };

  // 7. Request Password Reset (Public)
  requestPasswordReset: {
    params: {
      userName: string;
    };
    result: DataResponse<null>;
  };

  // 8. Resolve Password Reset (Admin)
  resolvePasswordReset: {
    params: {
      userName: string; // Natural Key
      tempPassword: string;
    };
    result: DataResponse<null>;
  };

  // 9. Get Pending Actions (Admin)
  getPendingActions: {
    params: {};
    result: DataResponse<PendingAdminActions>;
  };

  // 10. Approve User (Admin)
  approveUser: {
    params: {
      userName: string;
      role: Role;
    };
    result: DataResponse<null>;
  };

  // 11. Change Password (Authenticated User)
  changePassword: {
    params: {
      newPassword: string;
    };
    result: DataResponse<null>;
  };

  // 12. Confirm Password (Re-authentication for sensitive operations)
  confirmPassword: {
    params: {
      password: string;
    };
    result: DataResponse<boolean>;
  };

  // 13. Create User (Superuser only)
  // Makes a regular user or a kiosk user, with a password set by the administrator.
  // A regular user's saId must be a real RealGreen employee id that is not already a user.
  // A kiosk's saId is made up and must NOT be a real employee id.
  // Superuser status is never set here: it is a direct database edit (Compass) only.
  // `mustChangePassword` makes the given password temporary (the user must change it at login).
  createUser: {
    params: {
      userName: string;
      email: string;
      firstName: string;
      lastName: string;
      saId: string;
      role: Role;
      isKiosk: boolean;
      password: string;
      mustChangePassword: boolean;
    };
    result: DataResponse<User>;
  };

  // 14. Delete User (Superuser only)
  // Removes the user, their capabilities document, their pending password resets and their
  // credit card assignments (see deleteUserReferences). History that only records who did
  // something is left alone. The caller re-enters their own password, checked on the server.
  // A superuser or the caller themselves cannot be deleted.
  deleteUser: {
    params: {
      userName: string;
      password: string;
    };
    result: DataResponse<{ userName: string }>;
  };
}
