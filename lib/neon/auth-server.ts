import { createNeonAuth } from "@neondatabase/auth/next/server";

/** Server-side Auth instance. Never expose the cookie secret to the browser. */
export function createNeonServerAuth() {
  const baseUrl = process.env.NEON_AUTH_BASE_URL;
  const secret = process.env.NEON_AUTH_COOKIE_SECRET;
  if (!baseUrl || !secret || secret.length < 32) {
    throw new Error("Neon Auth ainda não foi configurado neste ambiente.");
  }
  return createNeonAuth({ baseUrl, cookies: { secret } });
}
