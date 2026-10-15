import { neon } from "@neondatabase/serverless";

function getSql() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL não está configurada.");
  return neon(connectionString);
}

/** Owner lookup used only after the server has validated the Better Auth session. */
export async function userOwnsBarbershop(userId: string) {
  const sql = getSql();
  const rows = await sql`
    select exists (
      select 1 from public.barbearias where proprietario_id = ${userId}::uuid
    ) as owns_shop
  `;
  return rows[0]?.owns_shop === true;
}
