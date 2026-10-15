import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const BUCKET = "profile-images";

function config() {
  const endpoint = process.env.AWS_ENDPOINT_URL_S3;
  const region = process.env.AWS_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  if (!endpoint || !region || !accessKeyId || !secretAccessKey) {
    throw new Error("Neon Object Storage ainda não foi configurado neste ambiente.");
  }
  const origin = new URL(endpoint);
  if (origin.protocol !== "https:" || origin.username || origin.password || origin.search || origin.hash) {
    throw new Error("Endpoint do Neon Object Storage inválido.");
  }
  return {
    endpoint: origin.toString().replace(/\/$/, ""),
    client: new S3Client({ endpoint: origin.toString(), region, forcePathStyle: true,
      credentials: { accessKeyId, secretAccessKey } }),
  };
}

function validKey(key: string) {
  const parts = key.split("/");
  if (parts.length !== 2 || parts.some((part) => !part || part === "." || part === ".."
    || /[\\\u0000-\u001f\u007f]/.test(part))) {
    throw new Error("Caminho da imagem inválido.");
  }
  return parts;
}

export function neonPublicImageUrl(key: string) {
  const { endpoint } = config();
  const parts = validKey(key);
  return `${endpoint}/${BUCKET}/${parts.map(encodeURIComponent).join("/")}`;
}

export async function neonPutProfileImage(key: string, image: Uint8Array) {
  validKey(key);
  const { client } = config();
  await client.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: image,
    ContentType: "image/webp", CacheControl: "public, max-age=3600" }));
  return neonPublicImageUrl(key);
}

export async function neonDeleteProfileImage(key: string) {
  validKey(key);
  const { client } = config();
  await client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}
