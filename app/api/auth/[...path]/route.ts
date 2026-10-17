import { createNeonServerAuth } from "@/lib/neon/auth-server";
import type { NextRequest } from "next/server";

const auth = createNeonServerAuth();
const { GET: authGet, POST: authPost } = auth.handler();
export const POST = authPost;

// Neon Auth can return a signed session_data cookie without checking whether
// its session was revoked. Authentication checks must consult the upstream
// session store, including when an old cookie is replayed after sign-out.
export async function GET(request: NextRequest, context: RouteContext<"/api/auth/[...path]">) {
  const { path } = await context.params;
  if (path.length !== 1 || path[0] !== "get-session") {
    return authGet(request, context);
  }

  const url = new URL(request.url);
  url.searchParams.set("disableCookieCache", "true");
  const verifiedRequest = new Request(url, { headers: request.headers });
  return authGet(verifiedRequest, context);
}
