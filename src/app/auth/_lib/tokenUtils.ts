import jwt from "jsonwebtoken";
import { AUTH_CONST } from "@/app/auth/_lib/authConst";
import { AppError } from "@/lib/errors/AppError";
import {TokenPayload} from "@/app/auth/_types/authTypes";


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
  try {
    return jwt.verify(token, AUTH_CONST.SECRET.ACCESS) as TokenPayload;
  } catch (error) {
    throw new AppError({
      message: "Invalid or Expired Access Token",
      type: "AUTH_ERROR",
      statusCode: 401,
      isOperational: true,
      data: error,
    });
  }
}

export function verifyRefreshToken(token: string): TokenPayload {
  try {
    return jwt.verify(token, AUTH_CONST.SECRET.REFRESH) as TokenPayload;
  } catch (error) {
    throw new AppError({
      message: "Invalid or Expired Refresh Token",
      type: "AUTH_ERROR",
      statusCode: 403, // Refresh failure usually means re-login required
      isOperational: true,
      data: error,
    });
  }
}
