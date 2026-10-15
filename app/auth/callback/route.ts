import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createNeonServerAuth } from "@/lib/neon/auth-server";
import { safeAuthDestination } from "@/lib/auth/safe-redirect";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const auth = createNeonServerAuth();
  const { data: session } = await auth.getSession();
  if (!session?.user) {
    return NextResponse.redirect(new URL("/?erro=confirmacao", url.origin));
  }
  const destination = safeAuthDestination(url.searchParams.get("next"), url.origin);
  return NextResponse.redirect(new URL(destination, url.origin));
}
