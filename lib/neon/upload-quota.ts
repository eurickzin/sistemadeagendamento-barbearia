import { neon } from "@neondatabase/serverless";

/** Atomic server-only quota; p_user_id comes from a verified Auth session. */
export async function claimNeonUploadSlot(userId: string) {
  const connection = process.env.DATABASE_URL;
  if (!connection) throw new Error("Conexão do Neon não configurada.");
  const sql = neon(connection);
  const rows = await sql`select naregua_private.claim_upload_slot(${userId}::uuid) as allowed`;
  return rows[0]?.allowed === true;
}
