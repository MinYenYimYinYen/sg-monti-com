import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

// AES-256-GCM, not bcrypt: unlike the login passwords, QBO tokens must be recovered
// to call QuickBooks, so one-way hashing cannot be used.
const ALGORITHM = "aes-256-gcm";
const KEY_BYTES = 32;
const IV_BYTES = 12;
const AUTH_TAG_BYTES = 16;
// Prefix lets a future key or format change be told apart from stored v1 payloads.
const FORMAT_VERSION = "v1";

/**
 * Decodes the base64 (or base64url) key from QBO_TOKEN_ENCRYPTION_KEY. Node's base64
 * decoder accepts both alphabets and missing padding, so `openssl rand -base64 32`
 * output works with or without its trailing "=".
 */
export function parseEncryptionKey(encoded: string | undefined): Buffer {
  if (!encoded || !encoded.trim()) {
    throw new Error("QBO_TOKEN_ENCRYPTION_KEY is missing.");
  }
  const key = Buffer.from(encoded.trim(), "base64");
  if (key.length !== KEY_BYTES) {
    throw new Error(
      `QBO_TOKEN_ENCRYPTION_KEY must decode to ${KEY_BYTES} bytes (it decodes to ${key.length}).`,
    );
  }
  return key;
}

/** Returns `v1.<iv>.<authTag>.<ciphertext>`, each part base64. A fresh IV is used per call. */
export function encryptSecret({ plaintext, key }: { plaintext: string; key: Buffer }): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_BYTES });
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [
    FORMAT_VERSION,
    iv.toString("base64"),
    authTag.toString("base64"),
    ciphertext.toString("base64"),
  ].join(".");
}

/** Throws if the payload is malformed, was tampered with, or the key is wrong. */
export function decryptSecret({ payload, key }: { payload: string; key: Buffer }): string {
  const [version, ivPart, authTagPart, ciphertextPart, ...extraParts] = payload.split(".");
  if (
    version !== FORMAT_VERSION ||
    !ivPart ||
    !authTagPart ||
    ciphertextPart === undefined ||
    extraParts.length > 0
  ) {
    throw new Error("Unsupported encrypted payload format.");
  }
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivPart, "base64"), {
    authTagLength: AUTH_TAG_BYTES,
  });
  decipher.setAuthTag(Buffer.from(authTagPart, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextPart, "base64")),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}
