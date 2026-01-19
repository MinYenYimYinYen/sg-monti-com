import { NextRequest, NextResponse } from "next/server";
import { HandlerMap, OpMap } from "@/lib/api/types/rpcUtils";
import { assertRole } from "@/app/auth/_lib/assertRole";
import { normalizeError } from "@/lib/errors/errorHandler";
import { AuthContract } from "@/app/auth/_types/AuthContract";
import { rgApi } from "@/app/realGreen/employee/api/rgApi";
import { RawEmployee } from "@/app/realGreen/employee/Employee";
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
  verifyAccessToken,
  verifyRefreshToken,
} from "@/app/auth/_lib/tokenUtils";
import { AUTH_CONST } from "@/app/auth/_lib/authConst";
import { CheckedId, TokenPayload } from "@/app/auth/_types/authTypes";
import PasswordResetRequestModel from "@/app/auth/_models/PasswordResetRequestModel";
import { PasswordResetRequest } from "@/app/auth/_types/PasswordResetRequest";
import { ROLES } from "@/lib/api/types/roles";

/**
 * 1. DEFINE HANDLERS
 * Enforces strict typing: You MUST define 'roles' and 'handler'
 * for every operation in AuthContract.
 */
const handlers: HandlerMap<AuthContract> = {
  checkEligibility: {
    roles: ["public"],
    handler: async ({ saId }) => {
      await connectToMongoDB();

      const alreadyExists = !!(await UserModel.findOne({ saId }));
      // If exists locally, it's invalid for registration.
      // If not, check RealGreen.
      const isValid =
        !alreadyExists &&
        (
          await rgApi<RawEmployee | null>({
            path: `/Employee/${saId}`,
            method: "GET",
          })
        )?.id === saId;

      const checkedId: CheckedId = {
        checked: true,
        isValid,
        alreadyExists,
        idChecked: saId,
      };
      return {
        success: true,
        item: checkedId,
      };
    },
  },
  register: {
    roles: ["public"],
    handler: async (params) => {
      await connectToMongoDB();
      const { password, saId, ...rest } = params;

      // 1. Re-Verify Eligibility (Trust No One)
      const alreadyExists = await UserModel.findOne({ saId });
      if (alreadyExists) {
        throw new AppError({
          message: "User already exists",
          type: "VALIDATION_ERROR",
          statusCode: 400,
        });
      }

      const rgEmployee = await rgApi<RawEmployee | null>({
        path: `/Employee/${saId}`,
        method: "GET",
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
        ...rest,
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
        item: cleanUser,
      };
    },
  },
  login: {
    roles: ["public"],
    handler: async ({ userName, password }) => {
      await connectToMongoDB();

      // 1. Find User
      const userDoc = await UserModel.findOne({ userName }).lean();
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
      const payload: TokenPayload = {
        role: user.role,
        saId: user.saId,
        mustChangePassword: user.mustChangePassword,
      };
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
        item: cleanUser,
      };
    },
  },
  logout: {
    roles: ["public"],
    handler: async () => {
      const cookieStore = await cookies();
      cookieStore.delete(AUTH_CONST.COOKIE.ACCESS_TOKEN);
      cookieStore.delete(AUTH_CONST.COOKIE.REFRESH_TOKEN);
      return { success: true };
    },
  },
  refresh: {
    roles: ["public"],
    handler: async () => {
      const cookieStore = await cookies();
      const refreshToken = cookieStore.get(AUTH_CONST.COOKIE.REFRESH_TOKEN);

      if (!refreshToken) {
        throw new AppError({
          message: "No refresh token found",
          type: "AUTH_ERROR",
          statusCode: 401,
        });
      }

      // 1. Verify Refresh Token
      const payload = verifyRefreshToken(refreshToken.value);

      // 2. Issue New Access Token
      // We reuse the payload from the refresh token (userId, role, saId)
      // Ideally, we should check if the user still exists/is active in DB here
      // but for speed, we can trust the signed refresh token for now.
      const newPayload: TokenPayload = {
        role: payload.role,
        saId: payload.saId,
        mustChangePassword: payload.mustChangePassword,
      };
      const newAccessToken = signAccessToken(newPayload);

      // 3. Set New Access Cookie
      cookieStore.set(AUTH_CONST.COOKIE.ACCESS_TOKEN, newAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: AUTH_CONST.EXPIRATION.COOKIE.ACCESS,
      });

      return { success: true };
    },
  },
  checkAuth: {
    roles: ["public"], // We verify manually
    handler: async () => {
      const cookieStore = await cookies();
      const token = cookieStore.get(AUTH_CONST.COOKIE.ACCESS_TOKEN);

      if (!token) {
        throw new AppError({
          message: "No token",
          type: "AUTH_ERROR",
          statusCode: 401,
        });
      }

      // Verify & Get User
      const payload = verifyAccessToken(token.value);
      await connectToMongoDB();
      const user = await UserModel.findOne({ saId: payload.saId });

      if (!user) {
        throw new AppError({
          message: "User not found",
          type: "AUTH_ERROR",
          statusCode: 401,
        });
      }

      return { success: true, item: cleanMongoObject(user.toObject()) };
    },
  },
  requestPasswordReset: {
    roles: ["public"],
    handler: async ({ userName }) => {
      await connectToMongoDB();

      // 1. Find User
      const user = await UserModel.findOne({ userName });

      // Security: Always return success to prevent username enumeration
      if (!user) {
        return { success: true };
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

      return { success: true };
    },
  },
  resolvePasswordReset: {
    roles: ["admin"],
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

      // 3. Hash New Password
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      // 4. Update User
      user.password = hashedPassword;
      user.mustChangePassword = true;
      await user.save();

      // 5. Resolve Request
      request.status = "resolved";
      await request.save();

      return { success: true };
    },
  },
  getPendingActions: {
    roles: ["admin"],
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
        item: {
          appliedUsers: appliedUsers,
          pendingResets,
        },
      };
    },
  },
  approveUser: {
    roles: ["admin"],
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

      return { success: true };
    },
  },
  changePassword: {
    // Allow any authenticated role to change their password
    roles: [...ROLES, "applied"],
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
      const user = await UserModel.findOne({ saId: payload.saId });

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
      const newPayload: TokenPayload = {
        role: user.role,
        saId: user.saId,
        mustChangePassword: false,
      };
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

      return { success: true };
    },
  },
};

/**
 * 2. THE GATEWAY (Generic POST)
 * Handles Deserialization, Validation, Auth, and Error Normalization.
 */
export async function POST(req: NextRequest) {
  try {
    // A. Parse Body & Validate Op
    const body = (await req.json()) as OpMap<AuthContract>;
    const { op, ...params } = body;
    const config = handlers[op];

    if (!config) {
      return NextResponse.json(
        { success: false, message: `Operation '${op}' not supported` },
        { status: 400 },
      );
    }

    // B. Security Check
    await assertRole(config.roles);

    // C. Execution
    const result = await config.handler(params as any);
    return NextResponse.json(result);
  } catch (e) {
    // D. "TWO-HOP" ERROR HANDLING
    const error = normalizeError(e);

    // 1. Log the REAL error (with stack trace) for the developer
    console.error(`[API] ${error.type}: ${error.message}`, {
      stack: error.stack,
      data: error.data,
    });

    // --- REFACTOR: Return 200 for Operational Errors ---
    if (error.isOperational) {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
          silent: error.silent,
          code: error.statusCode,
        },
        { status: 200 }, // 200 OK for handled errors
      );
    }

    // Keep 500 for unexpected crashes
    return NextResponse.json(
      {
        success: false,
        message: "Internal Server Error",
      },
      { status: 500 },
    );
  }
}
