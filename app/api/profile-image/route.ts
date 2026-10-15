import { NextResponse, type NextRequest } from "next/server";
import { createNeonServerAuth } from "@/lib/neon/auth-server";
import { neonDeleteProfileImage, neonPutProfileImage } from "@/lib/neon/storage";
import { claimNeonUploadSlot } from "@/lib/neon/upload-quota";
import { userOwnsBarbershop } from "@/lib/neon/server-db";
import { getProfileImageStoragePath } from "@/lib/profile-images";
import { MAX_IMAGE_BYTES, normalizeImage } from "@/lib/security/normalize-image";
import { BodyTooLargeError, readLimitedForm } from "@/lib/security/read-limited-form";

const PURPOSES = ["avatar", "barbershop-logo", "barbershop-cover"] as const;

async function getAuthenticatedUser() {
  const auth = createNeonServerAuth();
  const { data: session } = await auth.getSession();
  return session?.user ?? null;
}

function sameOrigin(request: NextRequest) {
  return request.headers.get("origin") === request.nextUrl.origin;
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "Origem não permitida." }, { status: 403 });
  }
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_IMAGE_BYTES + 65536) {
    return NextResponse.json({ error: "Imagem acima de 5 MB." }, { status: 413 });
  }

  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Faça login novamente." }, { status: 401 });

  let form: FormData;
  try {
    form = await readLimitedForm(request, MAX_IMAGE_BYTES + 65536);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof BodyTooLargeError ? "Imagem acima de 5 MB." : "Envio inválido." },
      { status: error instanceof BodyTooLargeError ? 413 : 400 },
    );
  }
  const file = form.get("file");
  const purpose = form.get("purpose");
  if (!(file instanceof File) || typeof purpose !== "string" || !PURPOSES.includes(purpose as typeof PURPOSES[number])) {
    return NextResponse.json({ error: "Imagem ou finalidade inválida." }, { status: 400 });
  }
  if (file.size === 0 || file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: "A imagem deve ter no máximo 5 MB." }, { status: 413 });
  }
  if (purpose !== "avatar") {
    try {
      if (!(await userOwnsBarbershop(user.id))) {
        return NextResponse.json({ error: "Barbearia não autorizada." }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: "Envio de imagens indisponível no momento." }, { status: 503 });
    }
  }

  let normalized: Buffer;
  try {
    normalized = await normalizeImage(Buffer.from(await file.arrayBuffer()));
  } catch {
    return NextResponse.json({ error: "Escolha uma imagem JPG, PNG ou WebP válida de até 5 MB." }, { status: 415 });
  }

  try {
    if (!(await claimNeonUploadSlot(user.id))) {
      return NextResponse.json({ error: "Limite de 10 imagens por hora atingido. Tente novamente mais tarde." }, { status: 429 });
    }
    const key = `${user.id}/${purpose}-${crypto.randomUUID()}.webp`;
    const url = await neonPutProfileImage(key, normalized);
    return NextResponse.json({ url }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Envio de imagens indisponível no momento." }, { status: 503 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "Origem não permitida." }, { status: 403 });
  }
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Faça login novamente." }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Solicitação inválida." }, { status: 400 });
  }
  const url = typeof body === "object" && body !== null && "url" in body && typeof body.url === "string"
    ? body.url : "";
  const key = getProfileImageStoragePath(url);
  if (!key || !key.startsWith(`${user.id}/`)) {
    return NextResponse.json({ error: "A imagem não pertence a esta conta." }, { status: 403 });
  }
  try {
    await neonDeleteProfileImage(key);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Não foi possível remover a imagem." }, { status: 503 });
  }
}
