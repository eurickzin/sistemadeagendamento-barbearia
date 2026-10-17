import { createAuthClient } from "@neondatabase/auth";
import { createClient as createNeonSdkClient, defaultDeriveNeonUrls, SupabaseAuthAdapter } from "@neondatabase/neon-js";

type NeonClient = ReturnType<typeof createNeonSdkClient>;

async function getAuthToken(authUrl: string, path: string): Promise<string | null> {
  try {
    const response = await fetch(`${authUrl}${path}`, {
      cache: "no-store",
      credentials: "same-origin",
    });
    if (!response.ok) return null;

    const body: unknown = await response.json();
    if (typeof body !== "object" || body === null || !("token" in body)) return null;
    const token = body.token;
    return typeof token === "string" && token.split(".").length === 3 ? token : null;
  } catch {
    return null;
  }
}

function buildClient(): NeonClient {
  const databaseUrl = process.env.NEXT_PUBLIC_NEON_URL;
  const appOrigin = typeof window === "undefined"
    ? process.env.NEXT_PUBLIC_APP_ORIGIN
    : window.location.origin;
  const serverAuthUrl = process.env.NEON_AUTH_BASE_URL;
  if (!databaseUrl || (!appOrigin && typeof window !== "undefined") ||
      (!serverAuthUrl && typeof window === "undefined")) {
    throw new Error("Neon ainda não foi configurado neste ambiente.");
  }

  const authUrl = typeof window === "undefined"
    ? serverAuthUrl!
    : new URL("/api/auth", appOrigin!).toString();
  const auth = createAuthClient(authUrl, { adapter: SupabaseAuthAdapter() });
  const data = createNeonSdkClient({
    dataApi: {
      url: defaultDeriveNeonUrls(databaseUrl).dataApi,
      getToken: async () => {
        if (typeof window !== "undefined") {
          const token = await getAuthToken(authUrl, "/token");
          if (token) return token;
        }
        return getAuthToken(authUrl, "/token/anonymous");
      },
    },
  });

  return Object.assign(data, { auth }) as unknown as NeonClient;
}

/** Shared Neon Auth and Data API client with an explicit JWT token provider. */
let neonClient: NeonClient | undefined;

export function createClient(): NeonClient {
  if (neonClient) return neonClient;
  neonClient = buildClient();
  return neonClient;
}
