const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

export function getProfileImageStoragePath(publicUrl: string) {
  try {
    const url = new URL(publicUrl);
    const endpoint = process.env.AWS_ENDPOINT_URL_S3;
    if (!endpoint || url.origin !== new URL(endpoint).origin) return null;
    const prefix = "/profile-images/";
    if (!url.pathname.startsWith(prefix)) return null;

    const encodedPath = url.pathname.slice(prefix.length);
    const parts = encodedPath.split("/").map(decodeURIComponent);
    if (parts.length !== 2 || parts.some((part) =>
      !part || part === "." || part === ".." || /[/\\\u0000-\u001f\u007f]/.test(part)
    )) return null;
    return parts.join("/");
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

  const form = new FormData();
  form.set("file", file);
  form.set("purpose", purpose);
  const response = await fetch("/api/profile-image", { method: "POST", body: form });
  const result = await response.json() as { url?: string; error?: string };
  if (!response.ok || !result.url) {
    throw new Error(result.error ?? "Não foi possível enviar a imagem.");
  }
  const path = getProfileImageStoragePath(result.url);
  if (!path?.startsWith(`${userId}/${purpose}-`)) {
    throw new Error("O caminho da imagem enviada é inválido.");
  }
  return result.url;
}

export async function deleteProfileImage(publicUrl: string, userId: string) {
  const key = getProfileImageStoragePath(publicUrl);
  if (!key || !key.startsWith(`${userId}/`)) {
    throw new Error("A imagem não pertence a esta conta.");
  }
  const response = await fetch("/api/profile-image", {
    method: "DELETE",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ url: publicUrl }),
  });
  if (!response.ok) {
    const result = await response.json() as { error?: string };
    throw new Error(result.error ?? "Não foi possível remover a imagem.");
  }
}
