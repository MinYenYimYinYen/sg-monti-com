import { headers } from "next/headers";
import { createQboRpcHandler } from "@/app/qbo/_lib/api/createQboRpcHandler";
import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { AppError } from "@/lib/errors/AppError";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import UserModel from "@/app/auth/_models/UserModel";
import { QboConnectionContract } from "@/app/qbo/connection/api/QboConnectionContract";
import {
  disconnectConnection,
  getConnectionStatus,
  startConnect,
} from "@/app/qbo/connection/_lib/qboConnectionServer";
import { testQboConnection } from "@/app/qbo/connection/_lib/qboConnectionTestServer";
import { qboConnectionCapabilities } from "@/app/qbo/connection/qboConnectionCapabilities";

const { can } = qboConnectionCapabilities;

/** The proxy injects the caller's saId; the connection records who they are by userName. */
async function getCurrentUserName(): Promise<string> {
  const headerStore = await headers();
  const saId = headerStore.get("x-user-id");
  if (!saId) {
    throw new AppError({
      message: "Authentication required",
      type: "AUTH_ERROR",
      statusCode: 401,
    });
  }
  await connectToMongoDB();
  const user = await UserModel.findOne({ saId }).lean();
  if (!user) {
    throw new AppError({
      message: "Authentication required",
      type: "AUTH_ERROR",
      statusCode: 401,
    });
  }
  return user.userName;
}

// Connection management was admin only. Tokens never appear in any result.
const handlers: HandlerMap<QboConnectionContract> = {
  status: {
    capability: can.connection.read,
    handler: async () => {
      return { success: true, payload: await getConnectionStatus() };
    },
  },

  startConnect: {
    capability: can.connection.write,
    handler: async () => {
      const userName = await getCurrentUserName();
      const authorizeUrl = await startConnect({ userName });
      return { success: true, payload: { authorizeUrl } };
    },
  },

  // Its own capability: it stops every QuickBooks screen until someone reconnects.
  disconnect: {
    capability: can.connectionRevocation.write,
    handler: async () => {
      return { success: true, payload: await disconnectConnection() };
    },
  },

  // A live read of CompanyInfo, so a QuickBooks failure is returned as an error message.
  testConnection: {
    capability: can.connection.read,
    handler: async () => {
      return { success: true, payload: await testQboConnection() };
    },
  },
};

export const POST = createQboRpcHandler(handlers);
