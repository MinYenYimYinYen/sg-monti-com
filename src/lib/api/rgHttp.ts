// src/lib/api/rgHttp.ts
import { trimStringValues } from "@/lib/primatives/trimStringValues";
import {AppError} from "@/lib/errors/AppError";

export const realGreenBaseUrl = "https://saapi.realgreen.com";
const rgApiKey = process.env.RGAPI_KEY;

export async function rgHttp<T>(endpoint: string, config: RequestInit = {}) {
  const { body, headers, ...rest } = config;
  const url = `${realGreenBaseUrl}${endpoint}`;

  try {
    const res = await fetch(url, {
      ...rest,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        apiKey: rgApiKey || "",
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      // RealGreen usually returns { message: string, ... }
      const errorData = await res.json().catch(() => ({}));
      const message = errorData.message || `RealGreen Error: ${res.statusText}`;

      // Throw explicit external error
      throw new AppError({
        message,
        type: "EXTERNAL_ERROR", // Distinct from your internal API
        statusCode: res.status,
        isOperational: true,
        data: errorData
      });
    }

    let data = await res.json();

    // The "Interceptor" Logic
    if (data) {
      data = trimStringValues(data);
    }

    return data as T;

  } catch (error) {
    if (error instanceof AppError) throw error;

    throw new AppError({
      message: "Failed to connect to RealGreen",
      type: "NETWORK_ERROR",
      statusCode: 0,
      isOperational: true,
      data: error
    });
  }
}
