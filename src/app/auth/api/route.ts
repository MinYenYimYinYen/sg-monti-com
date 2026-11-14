import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { AuthContract } from "@/app/auth/_types/AuthContract";
import { rgApi } from "@/app/realGreen/_lib/api/rgApi";
import { EmployeeRaw } from "@/app/realGreen/employee/types/EmployeeTypes";
import UserModel from "@/app/auth/_models/UserModel";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { AppError } from "@/lib/errors/AppError";
import bcrypt from "bcrypt";
import {
  cleanMongoArray,
  cleanMongoObject,
} from "@/lib/mongoose/cleanMongoObj";
import { User, UserWithPW } from "@/app/auth/_types/User";
import { cookies } from "next/headers";
import {
  signAccessToken,
  signRefreshToken,
  buildTokenPayload,
  tokenPayloadFromUser,
  verifyAccessToken,
  verifyRefreshToken,
} from "@/app/auth/_lib/tokenUtils";
import { AUTH_CONST } from "@/app/auth/_lib/authConst";
import { CheckedId } from "@/app/auth/_types/authTypes";
import PasswordResetRequestModel from "@/app/auth/_models/PasswordResetRequestModel";
import { PasswordResetRequest } from "@/app/auth/_types/PasswordResetRequest";
import { createRpcHandler } from "@/lib/api/createRpcHandler";
import { exactMatchIgnoreCase, isValidUserName, USER_NAME_RULE_MESSAGE } from "@/app/auth/_lib/userNameUtils";
import { validateCreateUser } from "@/app/auth/_lib/userValidation";
import {
  canResetPasswordOf,
  duplicateKeyField,
  duplicateKeyMessage,
  judgeBogusSaId,
  judgeRealSaId,
} from "@/app/auth/_lib/userCreation";
import { lookupEmployeeOutcome } from "@/app/auth/_lib/lookupEmployeeOutcome";
import { loadVerifiedCaller } from "@/app/permission/_lib/capabilityLoaders";
import { assertText } from "@/app/permission/_lib/assertText";
import { UserCapabilitiesModel } from "@/app/permission/userCapabilities/UserCapabilitiesModel";
import { assertCurrentUserPassword } from "@/app/syncUtils/_lib/verifyCurrentUserPassword";
import { judgeUserDeletion } from "@/app/auth/_lib/userDeletion";
import { deleteUserReferences } from "@/app/auth/_lib/deleteUserReferences";
import { can } from "@/permission/can";

/**
 * 1. DEFINE HANDLERS
 * Enforces strict typing: You MUST define a gate ('capability') and 'handler'
 * for every operation in AuthContract.
 *
 * 'public' ops need no capability. Those that act on the signed-in user (checkAuth, refresh,
 * confirmPassword, changePassword) verify the cookie themselves and refuse a missing session.
 */
const handlers: HandlerMap<AuthContract> = {
  checkEligibility: {
    capability: "public",
    handler: async ({ saId }) => {
      await connectToMongoDB();

      const alreadyExists = !!(await UserModel.findOne({ saId: { $regex: exactMatchIgnoreCase(saId) } }));
      // If exists locally, it's invalid for registration.
      // If not, check RealGreen.
      const rgEmployee = await rgApi<EmployeeRaw | null>({
        path: `/Employee/${saId}`,
        method: "GET",
        pathTemplate: "/Employee/{employeeId}",
      });
      const isValid =
        !alreadyExists &&
        rgEmployee?.id?.toLowerCase() === saId.toLowerCase();

      const checkedId: CheckedId = {
        checked: true,
        isValid,
        alreadyExists,
        idChecked: saId,
      };
      return {
        success: true,
        payload: checkedId,
      };
    },
  },
  register: {
    capability: "public",
    handler: async (params) => {
      await connectToMongoDB();
      const { password, saId, ...rest } = params;

      if (!isValidUserName(rest.userName)) {
        throw new AppError({
          message: USER_NAME_RULE_MESSAGE,
          type: "VALIDATION_ERROR",
          statusCode: 400,
        });
      }

      // 1. Re-Verify Eligibility (Trust No One)
      const alreadyExists = await UserModel.findOne({ saId });
      if (alreadyExists) {
        throw new AppError({
          message: "User already exists",
          type: "VALIDATION_ERROR",
          statusCode: 400,
        });
      }

      const rgEmployee = await rgApi<EmployeeRaw | null>({
        path: `/Employee/${saId}`,
        method: "GET",
        pathTemplate: "/Employee/{employeeId}",
      });

      if (rgEmployee?.id !== saId) {
        throw new AppError({
          message: "Invalid Employee ID",
          type: "VALIDATION_ERROR",
          statusCode: 400,
        });
      }

      // 2. Hash Password
      const hashedPassword = await bcrypt.hash(password, 10);

      // 3. Create User
      // We force the role to "applied", pending manager approval
      // to prevent someone from POSTing role: 'admin'
      const newUser = await UserModel.create({
        // Explicit fields, never ...rest: a client must not be able to set isSuperUser or isKiosk.
        email: rest.email,
        firstName: rest.firstName,
        lastName: rest.lastName,
        userName: rest.userName,
        saId,
        password: hashedPassword,
        role: "applied", // Default role
      });

      // 4. Return Safe User (No Password)
      const userObject = newUser.toObject();
      const { password: _, ...safeUser } = userObject;
      const cleanUser: User = cleanMongoObject(safeUser);

      return {
        success: true,
        payload: cleanUser,
      };
    },
  },
  createUser: {
    // Not a capability: it cannot be granted, so only a confirmed superuser (database, not the
    // token claim) can create users.
    capability: "superUser",
    handler: async (params) => {
      const check = validateCreateUser(params);
      if (!check.ok) {
        throw new AppError({ message: check.message, type: "VALIDATION_ERROR", statusCode: 400 });
      }
      const newUser = check.value;
      await connectToMongoDB();

      // Lookups elsewhere are case-insensitive, so "Luke" and "luke" must not coexist.
      const [sameUserName, sameSaId] = await Promise.all([
        UserModel.exists({ userName: { $regex: exactMatchIgnoreCase(newUser.userName) } }),
        UserModel.exists({ saId: { $regex: exactMatchIgnoreCase(newUser.saId) } }),
      ]);
      if (sameUserName) {
        throw new AppError({ message: duplicateKeyMessage("userName"), type: "VALIDATION_ERROR", statusCode: 400 });
      }
      if (sameSaId) {
        throw new AppError({ message: duplicateKeyMessage("saId"), type: "VALIDATION_ERROR", statusCode: 400 });
      }

      // Both checks fail closed if RealGreen can't say. A kiosk uses a made-up id that must not
      // belong to a real employee; a regular user must use the person's real employee id.
      const outcome = await lookupEmployeeOutcome(newUser.saId);
      let saId = newUser.saId;
      if (newUser.isKiosk) {
        const verdict = judgeBogusSaId({ saId, outcome });
        if (!verdict.ok) {
          throw new AppError({ message: verdict.message, type: "VALIDATION_ERROR", statusCode: 400 });
        }
      } else {
        const verdict = judgeRealSaId({ saId, outcome });
        if (!verdict.ok) {
          throw new AppError({ message: verdict.message, type: "VALIDATION_ERROR", statusCode: 400 });
        }
        // Stored with RealGreen's own casing, like a user who registered themselves.
        saId = verdict.employeeId;
      }

      const hashedPassword = await bcrypt.hash(newUser.password, 10);

      let created;
      try {
        // Explicit fields, never a spread: newUser carries the plain-text password.
        created = await UserModel.create({
          userName: newUser.userName,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          saId,
          role: newUser.role,
          // Absent means false, like every user that already exists.
          ...(newUser.isKiosk ? { isKiosk: true } : {}),
          password: hashedPassword,
          mustChangePassword: newUser.mustChangePassword,
        });
      } catch (error) {
        const field = duplicateKeyField(error);
        if (field) {
          throw new AppError({ message: duplicateKeyMessage(field), type: "VALIDATION_ERROR", statusCode: 400 });
        }
        throw error;
      }

      const { password: _password, ...safeUser } = created.toObject();
      return { success: true, payload: cleanMongoObject(safeUser) as User };
    },
  },
  deleteUser: {
    // Not a capability: only a confirmed superuser (database, not the token claim) may delete.
    capability: "superUser",
    handler: async (params) => {
      // The body is untrusted JSON, so both fields are checked for type before any query.
      const userName = assertText({ value: params.userName, label: "User name" });
      const password = assertText({ value: params.password, label: "Password" });

      // Re-authentication, enforced here so calling the API directly cannot skip it.
      await assertCurrentUserPassword(password);

      await connectToMongoDB();
      const caller = await loadVerifiedCaller();
      const target = await UserModel.findOne({ userName }).select("userName isSuperUser").lean();
      if (!target) {
        throw new AppError({ message: "User not found.", type: "VALIDATION_ERROR", statusCode: 400 });
      }

      const verdict = judgeUserDeletion({ actorUserName: caller.userName, target });
      if (!verdict.ok) {
        throw new AppError({ message: verdict.message, type: "VALIDATION_ERROR", statusCode: 400 });
      }

      // Access goes first, the user last. If something fails part way, the user is left with
      // less access, never an orphaned grant that a later user with the same name would inherit.
      await UserCapabilitiesModel.deleteOne({ userName: target.userName });
      await PasswordResetRequestModel.deleteMany({ userName: target.userName, status: "pending" });
      await deleteUserReferences({ userName: target.userName });
      await UserModel.deleteOne({ userName: target.userName });

      return { success: true, payload: { userName: target.userName } };
    },
  },
  login: {
    capability: "public",
    handler: async ({ userName, password }) => {
      await connectToMongoDB();

      // 1. Find User
      const userDoc = await UserModel.findOne({ userName: { $regex: exactMatchIgnoreCase(userName) } }).lean();
      if (!userDoc) {
        throw new AppError({
          message: "Invalid credentials",
          type: "AUTH_ERROR",
          statusCode: 401,
        });
      }
      const user = cleanMongoObject(userDoc) as UserWithPW;

      // 2. Verify Password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        throw new AppError({
          message: "Invalid credentials",
          type: "AUTH_ERROR",
          statusCode: 401,
        });
      }

      // 3. Generate Tokens
      const payload = tokenPayloadFromUser(user);
      const accessToken = signAccessToken(payload);
      const refreshToken = signRefreshToken(payload);

      // 4. Set Cookies
      const cookieStore = await cookies();

      cookieStore.set(AUTH_CONST.COOKIE.ACCESS_TOKEN, accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: AUTH_CONST.EXPIRATION.COOKIE.ACCESS,
      });

      cookieStore.set(AUTH_CONST.COOKIE.REFRESH_TOKEN, refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: AUTH_CONST.EXPIRATION.COOKIE.REFRESH,
      });

      // 5. Return Safe User
      const { password: _, ...cleanUser } = user;

      return {
        success: true,
        payload: cleanUser,
      };
    },
  },
  logout: {
    capability: "public",
    handler: async () => {
      const cookieStore = await cookies();
      cookieStore.delete(AUTH_CONST.COOKIE.ACCESS_TOKEN);
      cookieStore.delete(AUTH_CONST.COOKIE.REFRESH_TOKEN);
      return { success: true, payload: null };
    },
  },
  refresh: {
    capability: "public",
    handler: async () => {
      const cookieStore = await cookies();
      const refreshToken = cookieStore.get(AUTH_CONST.COOKIE.REFRESH_TOKEN);

      if (!refreshToken) {
        throw new AppError({
          message: "No refresh token found",
          type: "AUTH_ERROR",
          statusCode: 401,
          silent: true, // Silent on server logs
        });
      }

      // 1. Verify Refresh Token
      const payload = verifyRefreshToken(refreshToken.value);

      // 2. Issue New Access Token
      // We reuse the payload from the refresh token (userId, role, saId)
      // Ideally, we should check if the user still exists/is active in DB here
      // but for sec90Feet, we can trust the signed refresh token for now.
      const newPayload = buildTokenPayload(payload);
      const newAccessToken = signAccessToken(newPayload);

      // 3. Set New Access Cookie
      cookieStore.set(AUTH_CONST.COOKIE.ACCESS_TOKEN, newAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: AUTH_CONST.EXPIRATION.COOKIE.ACCESS,
      });

      return { success: true, payload: null };
    },
  },
  checkAuth: {
    capability: "public", // We verify manually
    handler: async () => {
      const cookieStore = await cookies();
      const token = cookieStore.get(AUTH_CONST.COOKIE.ACCESS_TOKEN);

      if (!token) {
        throw new AppError({
          message: "No token",
          type: "AUTH_ERROR",
          statusCode: 401,
          silent: true, // Silent on server logs
        });
      }

      // Verify & Get User
      const payload = verifyAccessToken(token.value);
      await connectToMongoDB();
      const user = await UserModel.findOne({ userName: payload.userName });

      if (!user) {
        throw new AppError({
          message: "User not found",
          type: "AUTH_ERROR",
          statusCode: 401,
        });
      }

      // Never send the password hash to the client.
      const { password: _password, ...safeUser } = user.toObject();
      return { success: true, payload: cleanMongoObject(safeUser) };
    },
  },
  requestPasswordReset: {
    capability: "public",
    handler: async ({ userName }) => {
      await connectToMongoDB();

      // 1. Find User
      const user = await UserModel.findOne({ userName: { $regex: exactMatchIgnoreCase(userName) } });

      // Security: Always return success to prevent username enumeration
      if (!user) {
        return { success: true, payload: null };
      }

      // 2. Create Request (Upsert to handle duplicates gracefully)
      // We use findOneAndUpdate with upsert to ensure we don't create duplicates
      // if one is already pending.
      await PasswordResetRequestModel.findOneAndUpdate(
        { userName: user.userName, status: "pending" },
        {
          userName: user.userName,
          saId: user.saId,
          firstName: user.firstName,
          lastName: user.lastName,
          status: "pending",
        },
        { upsert: true, new: true },
      );

      return { success: true, payload: null };
    },
  },
  resolvePasswordReset: {
    capability: can.accessRequests.write,
    handler: async ({ userName, tempPassword }) => {
      await connectToMongoDB();

      // 1. Find Request
      const request = await PasswordResetRequestModel.findOne({
        userName,
        status: "pending",
      });
      if (!request) {
        throw new AppError({
          message: "No pending request found for this user",
          type: "VALIDATION_ERROR",
          statusCode: 404,
        });
      }

      // 2. Find User
      const user = await UserModel.findOne({ userName });
      if (!user) {
        throw new AppError({
          message: "User not found",
          type: "SERVER_ERROR",
          statusCode: 500,
        });
      }

      // Only a superuser may reset a kiosk or superuser. Any admin could otherwise take
      // one over, which would defeat the rule that superuser status is controlled in Compass.
      const caller = await loadVerifiedCaller();
      if (!canResetPasswordOf({ target: user, actorIsSuperUser: caller.isSuperUser })) {
        throw new AppError({
          message: "Only a superuser can reset the password of a kiosk or superuser.",
          type: "AUTH_ERROR",
          statusCode: 403,
        });
      }

      // 3. Hash New Password
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      // 4. Update User
      user.password = hashedPassword;
      user.mustChangePassword = true;
      await user.save();

      // 5. Resolve Request
      request.status = "resolved";
      await request.save();

      return { success: true, payload: null };
    },
  },
  getPendingActions: {
    capability: can.accessRequests.read,
    handler: async () => {
      await connectToMongoDB();

      // 1. Get Applied Users
      const appliedUsersDocs = await UserModel.find({ role: "applied" }).lean();
      // Remove passwords from the result
      const appliedUsers = cleanMongoArray(appliedUsersDocs).map((u) => {
        const { password, ...rest } = u as any;
        return rest as User;
      });

      // 2. Get Pending Password Resets
      const pendingResetsDocs = await PasswordResetRequestModel.find({
        status: "pending",
      }).lean();
      const pendingResets = cleanMongoArray(
        pendingResetsDocs,
      ) as PasswordResetRequest[];

      return {
        success: true,
        payload: {
          appliedUsers: appliedUsers,
          pendingResets,
        },
      };
    },
  },
  approveUser: {
    // Sets a role, which still gates every route not yet migrated, so this can make someone an admin.
    capability: can.accessRequests.write,
    handler: async ({ userName, role }) => {
      await connectToMongoDB();

      const user = await UserModel.findOne({ userName });
      if (!user) {
        throw new AppError({
          message: "User not found",
          type: "VALIDATION_ERROR",
          statusCode: 404,
        });
      }

      if (user.role !== "applied") {
        throw new AppError({
          message: "User is not in 'applied' status",
          type: "VALIDATION_ERROR",
          statusCode: 400,
        });
      }

      user.role = role;
      await user.save();

      return { success: true, payload: null };
    },
  },
  confirmPassword: {
    // Any signed-in user, applied users included. The handler verifies the cookie itself.
    capability: "public",
    handler: async ({ password }) => {
      const cookieStore = await cookies();
      const token = cookieStore.get(AUTH_CONST.COOKIE.ACCESS_TOKEN);

      if (!token) {
        throw new AppError({
          message: "No token",
          type: "AUTH_ERROR",
          statusCode: 401,
        });
      }

      const payload = verifyAccessToken(token.value);

      await connectToMongoDB();
      const user = await UserModel.findOne({ userName: payload.userName }).lean();

      if (!user) {
        throw new AppError({
          message: "User not found",
          type: "AUTH_ERROR",
          statusCode: 401,
        });
      }

      // Compare provided password against stored hash.
      // Returns false (not an error) on mismatch — caller shows inline error.
      const isMatch = await bcrypt.compare(password, user.password);

      return { success: true, payload: isMatch };
    },
  },
  changePassword: {
    // Any signed-in user, applied users included. The handler verifies the cookie itself.
    capability: "public",
    handler: async ({ newPassword }) => {
      const cookieStore = await cookies();
      const token = cookieStore.get(AUTH_CONST.COOKIE.ACCESS_TOKEN);

      if (!token) {
        throw new AppError({
          message: "No token",
          type: "AUTH_ERROR",
          statusCode: 401,
        });
      }

      // 1. Verify Token to get User ID
      const payload = verifyAccessToken(token.value);

      await connectToMongoDB();
      const user = await UserModel.findOne({ userName: payload.userName });

      if (!user) {
        throw new AppError({
          message: "User not found",
          type: "AUTH_ERROR",
          statusCode: 401,
        });
      }

      // 2. Hash New Password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // 3. Update User
      user.password = hashedPassword;
      user.mustChangePassword = false; // Clear the flag
      await user.save();

      // 4. Issue New Tokens (without the flag)
      const newPayload = tokenPayloadFromUser(user);
      const accessToken = signAccessToken(newPayload);
      const refreshToken = signRefreshToken(newPayload);

      cookieStore.set(AUTH_CONST.COOKIE.ACCESS_TOKEN, accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: AUTH_CONST.EXPIRATION.COOKIE.ACCESS,
      });

      cookieStore.set(AUTH_CONST.COOKIE.REFRESH_TOKEN, refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: AUTH_CONST.EXPIRATION.COOKIE.REFRESH,
      });

      return { success: true, payload: null };
    },
  },
};

export const POST = createRpcHandler(handlers);
