import { createClient } from "@/lib/supabase/client";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

export function getProfileImageStoragePath(publicUrl: string) {
  try {
    const url = new URL(publicUrl);
    const prefix = "/storage/v1/object/public/profile-images/";
    const pathStart = url.pathname.indexOf(prefix);
    if (pathStart === -1) return null;

    const encodedPath = url.pathname.slice(pathStart + prefix.length);
    return encodedPath.split("/").map(decodeURIComponent).join("/");
  } catch {
    return null;
  }
}

export async function uploadProfileImage(
  file: File,
  userId: string,
  purpose: "avatar" | "barbershop-logo" | "barbershop-cover",
) {
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    throw new Error("Escolha uma imagem JPG, PNG ou WebP.");
  }
  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error("A imagem deve ter no máximo 5 MB.");
  }

  const extension = file.type.split("/")[1].replace("jpeg", "jpg");
  const path = `${userId}/${purpose}-${Date.now()}.${extension}`;
  const supabase = createClient();
  const { error } = await supabase.storage
    .from("profile-images")
    .upload(path, file, { contentType: file.type, cacheControl: "3600" });

  if (error) {
    const mensagem = error.message.toLowerCase();
    if (mensagem.includes("bucket") && (mensagem.includes("not found") || mensagem.includes("does not exist"))) {
      throw new Error("O armazenamento de imagens ainda não foi configurado. Execute supabase/profile-customization.sql no SQL Editor do Supabase.");
    }
    if (mensagem.includes("row-level security") || mensagem.includes("permission") || mensagem.includes("policy")) {
      throw new Error("O Supabase bloqueou o envio por falta de permissão. Execute as políticas de armazenamento de supabase/profile-customization.sql.");
    }
    throw new Error(`Falha no envio da imagem: ${error.message}`);
  }
  return supabase.storage.from("profile-images").getPublicUrl(path).data.publicUrl;
}
