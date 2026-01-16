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
import { cleanMongoObject } from "@/lib/mongoose/cleanMongoObj";
import { User } from "@/app/auth/_types/User";
import { cookies } from "next/headers";
import {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from "@/app/auth/_lib/tokenUtils";
import { AUTH_CONST } from "@/app/auth/_lib/authConst";

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

      return {
        success: true,
        checked: true,
        isValid,
        alreadyExists,
        idChecked: saId,
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
      // We force the role to 'public' (or 'tech'/'office' if you prefer) for new registrations
      // to prevent someone from POSTing role: 'admin'
      const newUser = await UserModel.create({
        ...rest,
        saId,
        password: hashedPassword,
        role: "public", // Default role
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
      const user = await UserModel.findOne({ userName });
      if (!user) {
        throw new AppError({
          message: "Invalid credentials",
          type: "AUTH_ERROR",
          statusCode: 401,
        });
      }

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
      const payload = {
        userId: user._id.toString(),
        role: user.role,
        saId: user.saId,
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
      const userObject = user.toObject();
      const { password: _, ...safeUser } = userObject;
      const cleanUser: User = cleanMongoObject(safeUser);

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
      const newPayload = {
        userId: payload.userId,
        role: payload.role,
        saId: payload.saId,
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
    roles: ["public"],
    handler: async () => {
      const cookieStore = await cookies();
      const token = cookieStore.get(AUTH_CONST.COOKIE.ACCESS_TOKEN);

      if (!token) {
        throw new AppError({
          message: "No token found",
          type: "AUTH_ERROR",
          statusCode: 401,
        });
      }

      // 1. Verify Token
      const payload = verifyAccessToken(token.value);

      // 2. Get User from DB
      await connectToMongoDB();
      const user = await UserModel.findById(payload.userId);

      if (!user) {
        throw new AppError({
          message: "User not found",
          type: "AUTH_ERROR",
          statusCode: 401,
        });
      }

      // 3. Return Safe User
      const userObject = user.toObject();
      const { password: _, ...safeUser } = userObject;
      const cleanUser: User = cleanMongoObject(safeUser);

      return {
        success: true,
        item: cleanUser,
      };
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

    // 2. Determine Response Status
    let status = 500;
    if (error.type === "EXTERNAL_ERROR") status = 502;
    else if (error.type === "VALIDATION_ERROR") status = 400;
    else if (error.type === "AUTH_ERROR") status = 403;

    // 3. Return Safe Response
    return NextResponse.json(
      {
        success: false,
        message: error.isOperational ? error.message : "Internal Server Error",
      },
      { status },
    );
  }
}
