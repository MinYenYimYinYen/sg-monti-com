import { headers } from "next/headers";
import UserModel from "@/app/auth/_models/UserModel";
import { AppError } from "@/lib/errors/AppError";

/**
 * The caller's userName. The proxy injects the caller's saId, and the study module identifies
 * people by userName. The capability check has already verified the session before a handler runs.
 * Server only; the caller has already connected to the database.
 */
export async function getCurrentUserName(): Promise<string> {
  const headerStore = await headers();
  const saId = headerStore.get("x-user-id");
  const user = saId ? await UserModel.findOne({ saId }).lean() : null;
  if (!user) {
    throw new AppError({ message: "Authentication required", type: "AUTH_ERROR", statusCode: 401 });
  }
  return user.userName;
}
