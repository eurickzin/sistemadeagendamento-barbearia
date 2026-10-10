import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
const url = new URL(request.url);
const code = url.searchParams.get("code");
const next = url.searchParams.get("next");

const destino =
next && next.startsWith("/") && !next.startsWith("//")
? next
: "/";

if (code) {
const supabase = await createClient();
const { error } = await supabase.auth.exchangeCodeForSession(code);

if (!error) {
  return NextResponse.redirect(new URL(destino, url.origin));
}

}

return NextResponse.redirect(
new URL("/?erro=confirmacao", url.origin)
);
}
