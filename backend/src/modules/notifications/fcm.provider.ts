import { createSign } from "crypto";

import { env } from "../../config/env";
import { logger } from "../../config/logger";
import type { FirebaseMessagingProvider, PushDispatchResult, PushNotificationPayload } from "./notifications.types";

const googleTokenAudience = "https://oauth2.googleapis.com/token";
const googleMessagingScope = "https://www.googleapis.com/auth/firebase.messaging";
const googleTokenEndpoint = "https://oauth2.googleapis.com/token";

type CachedAccessToken = {
  accessToken: string;
  expiresAtMs: number;
};

let cachedAccessToken: CachedAccessToken | null = null;

const base64UrlEncode = (value: string): string =>
  Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

const signJwt = (message: string, privateKey: string): string => {
  const signer = createSign("RSA-SHA256");
  signer.update(message);
  signer.end();
  return signer.sign(privateKey, "base64url");
};

const normalizePrivateKey = (privateKey: string): string => privateKey.replace(/\\n/g, "\n");

const buildServiceAccountAssertion = (): string | null => {
  if (!env.FCM_CLIENT_EMAIL || !env.FCM_PRIVATE_KEY) {
    return null;
  }

  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + 3600;
  const header = {
    alg: "RS256",
    typ: "JWT",
  };
  const payload = {
    iss: env.FCM_CLIENT_EMAIL,
    sub: env.FCM_CLIENT_EMAIL,
    aud: googleTokenAudience,
    scope: googleMessagingScope,
    iat: issuedAt,
    exp: expiresAt,
  };
  const unsignedToken = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(payload))}`;
  const signature = signJwt(unsignedToken, normalizePrivateKey(env.FCM_PRIVATE_KEY));
  return `${unsignedToken}.${signature}`;
};

const getAccessToken = async (): Promise<string | null> => {
  if (!env.FCM_ENABLED) {
    return null;
  }

  if (!env.FCM_PROJECT_ID || !env.FCM_CLIENT_EMAIL || !env.FCM_PRIVATE_KEY) {
    logger.warn("FCM is enabled but the service account environment variables are incomplete.");
    return null;
  }

  if (cachedAccessToken && cachedAccessToken.expiresAtMs > Date.now() + 60_000) {
    return cachedAccessToken.accessToken;
  }

  const assertion = buildServiceAccountAssertion();

  if (!assertion) {
    return null;
  }

  const response = await fetch(googleTokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    logger.warn("Failed to obtain FCM access token.", {
      status: response.status,
      body: errorBody,
    });
    return null;
  }

  const payload = (await response.json()) as { access_token: string; expires_in: number };
  cachedAccessToken = {
    accessToken: payload.access_token,
    expiresAtMs: Date.now() + payload.expires_in * 1000,
  };
  return payload.access_token;
};

const normalizePushData = (data?: Record<string, string>): Record<string, string> | undefined => {
  if (!data || Object.keys(data).length === 0) {
    return undefined;
  }

  return data;
};

const sendSinglePushMessage = async (
  accessToken: string,
  token: string,
  payload: PushNotificationPayload,
): Promise<{ success: boolean; invalidToken: boolean }> => {
  const response = await fetch(
    `https://fcm.googleapis.com/v1/projects/${env.FCM_PROJECT_ID}/messages:send`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          token,
          notification: {
            title: payload.title,
            body: payload.body,
          },
          data: normalizePushData(payload.data),
        },
      }),
    },
  );

  if (response.ok) {
    return {
      success: true,
      invalidToken: false,
    };
  }

  const errorText = await response.text();
  const invalidToken = response.status === 404 || errorText.includes("UNREGISTERED") || errorText.includes("registration-token-not-registered");

  logger.warn("FCM push delivery failed.", {
    status: response.status,
    body: errorText,
  });

  return {
    success: false,
    invalidToken,
  };
};

export const firebaseMessagingProvider: FirebaseMessagingProvider = {
  sendToTokens: async (tokens: string[], payload: PushNotificationPayload): Promise<PushDispatchResult> => {
    if (tokens.length === 0) {
      return {
        skipped: true,
        reason: "NO_DEVICE_TOKENS",
        successCount: 0,
        failureCount: 0,
        invalidTokens: [],
      };
    }

    if (!env.FCM_ENABLED) {
      return {
        skipped: true,
        reason: "FCM_DISABLED",
        successCount: 0,
        failureCount: 0,
        invalidTokens: [],
      };
    }

    const accessToken = await getAccessToken();

    if (!accessToken) {
      return {
        skipped: true,
        reason: "FCM_UNAVAILABLE",
        successCount: 0,
        failureCount: 0,
        invalidTokens: [],
      };
    }

    const result: PushDispatchResult = {
      skipped: false,
      successCount: 0,
      failureCount: 0,
      invalidTokens: [],
    };

    for (const token of tokens) {
      const delivery = await sendSinglePushMessage(accessToken, token, payload);

      if (delivery.success) {
        result.successCount += 1;
      } else {
        result.failureCount += 1;

        if (delivery.invalidToken) {
          result.invalidTokens.push(token);
        }
      }
    }

    return result;
  },
};
