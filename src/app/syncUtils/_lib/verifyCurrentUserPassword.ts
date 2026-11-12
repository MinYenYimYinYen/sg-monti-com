import bcrypt from "bcrypt";
import { cookies } from "next/headers";
import UserModel from "@/app/auth/_models/UserModel";
import { verifyAccessToken } from "@/app/auth/_lib/tokenUtils";
import { AUTH_CONST } from "@/app/auth/_lib/authConst";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { AppError } from "@/lib/errors/AppError";

/**
 * Server-side re-authentication for destructive operations. Throws an operational error
 * on a wrong password, so the wipe can never start without it even if the API is called directly.
 *
 * Mirrors the `confirmPassword` auth op, but fails closed instead of returning a boolean.
 */
export async function assertCurrentUserPassword(password: string): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_CONST.COOKIE.ACCESS_TOKEN);
  if (!token) {
    throw new AppError({ message: "Authentication required", type: "AUTH_ERROR", statusCode: 401 });
  }

  const payload = verifyAccessToken(token.value);
  await connectToMongoDB();
  const user = await UserModel.findOne({ userName: payload.userName }).lean();
  if (!user) {
    throw new AppError({ message: "User not found", type: "AUTH_ERROR", statusCode: 401 });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    // VALIDATION_ERROR (not AUTH_ERROR) so the client does not treat it as an expired session.
    throw new AppError({ message: "Incorrect password.", type: "VALIDATION_ERROR", statusCode: 400 });
  }
}
