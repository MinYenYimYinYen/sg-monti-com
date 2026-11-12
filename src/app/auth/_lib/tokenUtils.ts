import jwt from "jsonwebtoken";
import { AUTH_CONST } from "@/app/auth/_lib/authConst";
import { AppError } from "@/lib/errors/AppError";
import { TokenPayload } from "@/app/auth/_types/authTypes";
import { User } from "@/app/auth/_types/User";
import { isSuperUserEffective } from "@/permission/PermissionTypes";

/** Copies only the claim fields, so jwt's exp/iat never get re-signed into a new token. */
export function buildTokenPayload({
  role,
  saId,
  userName,
  mustChangePassword,
  isSuperUser,
}: TokenPayload): TokenPayload {
  return { role, saId, userName, mustChangePassword, isSuperUser };
}

/** A kiosk never carries the superuser hint, even if the flag is set on its document. */
export function tokenPayloadFromUser(
  user: Pick<User, "role" | "saId" | "userName" | "mustChangePassword" | "isSuperUser" | "isKiosk">,
): TokenPayload {
  return buildTokenPayload({
    role: user.role,
    saId: user.saId,
    userName: user.userName,
    mustChangePassword: user.mustChangePassword,
    isSuperUser: isSuperUserEffective(user),
  });
}

// Tokens issued before userName was added lack it. Refusing them forces one re-login.
function requireUserName(payload: TokenPayload, statusCode: number): TokenPayload {
  if (!payload.userName) {
    throw new AppError({
      message: "Session out of date. Please log in again.",
      type: "AUTH_ERROR",
      statusCode,
      isOperational: true,
    });
  }
  return payload;
}

export function signAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, AUTH_CONST.SECRET.ACCESS, {
    expiresIn: AUTH_CONST.EXPIRATION.JWT.ACCESS,
  });
}

export function signRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, AUTH_CONST.SECRET.REFRESH, {
    expiresIn: AUTH_CONST.EXPIRATION.JWT.REFRESH,
  });
}

export function verifyAccessToken(token: string): TokenPayload {
  let payload: TokenPayload;
  try {
    payload = jwt.verify(token, AUTH_CONST.SECRET.ACCESS) as TokenPayload;
  } catch (error) {
    throw new AppError({
      message: "Invalid or Expired Access Token",
      type: "AUTH_ERROR",
      statusCode: 401,
      isOperational: true,
      data: error,
    });
  }
  return requireUserName(payload, 401);
}

export function verifyRefreshToken(token: string): TokenPayload {
  let payload: TokenPayload;
  try {
    payload = jwt.verify(token, AUTH_CONST.SECRET.REFRESH) as TokenPayload;
  } catch (error) {
    throw new AppError({
      message: "Invalid or Expired Refresh Token",
      type: "AUTH_ERROR",
      statusCode: 403, // Refresh failure usually means re-login required
      isOperational: true,
      data: error,
    });
  }
  return requireUserName(payload, 403);
}
