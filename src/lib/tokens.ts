import { createHash, randomInt } from "crypto";

const TOKEN_LENGTH = 8;
const TOKEN_CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

// e.g. "X8P29LMQ". Uses crypto.randomInt (CSPRNG), not Math.random.
export function generateSessionToken(): string {
  let token = "";
  for (let i = 0; i < TOKEN_LENGTH; i++) {
    token += TOKEN_CHARSET[randomInt(TOKEN_CHARSET.length)];
  }
  return token;
}

// Only the hash is ever stored — the raw token is the guest's bearer
// credential and must never be persisted in plaintext.
export function hashToken(token: string): string {
  return createHash("sha256").update(token.toUpperCase()).digest("hex");
}
