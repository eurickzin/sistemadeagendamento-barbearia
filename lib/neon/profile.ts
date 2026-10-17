import type { createClient } from "./client";

interface ProfileChanges {
  nome?: string;
  telefone?: string;
  avatar_url?: string;
  barbearias_favoritas?: { id: string; nome: string; slug: string }[];
}

/** Save the signed-in user's profile without requiring UPDATE permission on its ID. */
export async function saveOwnProfile(
  neon: ReturnType<typeof createClient>,
  userId: string,
  changes: ProfileChanges,
): Promise<boolean> {
  const update = () => neon.from("profiles")
    .update(changes)
    .eq("id", userId)
    .select("id")
    .maybeSingle();

  const { data: updated, error: updateError } = await update();
  if (updateError) return false;
  if (updated) return true;

  const { data: inserted, error: insertError } = await neon.from("profiles")
    .insert({ id: userId, ...changes })
    .select("id")
    .maybeSingle();
  if (!insertError) return Boolean(inserted);

  // Another request may have inserted the same profile after the first update.
  if (insertError.code !== "23505") return false;
  const { data: retried, error: retryError } = await update();
  return Boolean(retried && !retryError);
}
