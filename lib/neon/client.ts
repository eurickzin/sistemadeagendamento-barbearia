import { createClient as createNeonSdkClient, defaultDeriveNeonUrls, SupabaseAuthAdapter } from "@neondatabase/neon-js";

type NeonClient = ReturnType<typeof createNeonSdkClient>;

/** Neon Auth + Data API client. Kept separate until the test project is ready. */
let neonClient: NeonClient | undefined;

export function createClient(): NeonClient {
  if (neonClient) return neonClient;
  const databaseUrl = process.env.NEXT_PUBLIC_NEON_URL;
  const appOrigin = typeof window === "undefined"
    ? process.env.NEXT_PUBLIC_APP_ORIGIN
    : window.location.origin;
  const serverAuthUrl = process.env.NEON_AUTH_BASE_URL;
  if (!databaseUrl || (!appOrigin && typeof window !== "undefined") ||
      (!serverAuthUrl && typeof window === "undefined")) {
    throw new Error("Neon ainda não foi configurado neste ambiente.");
  }
  neonClient = createNeonSdkClient({
    auth: {
      url: typeof window === "undefined"
        ? serverAuthUrl!
        : new URL("/api/auth", appOrigin!).toString(),
      adapter: SupabaseAuthAdapter(),
      allowAnonymous: true,
    },
    dataApi: { url: defaultDeriveNeonUrls(databaseUrl).dataApi },
  });
  return neonClient;
}
