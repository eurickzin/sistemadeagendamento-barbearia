/** Return only a same-origin path for the authentication callback. */
export function safeAuthDestination(value: string | null, origin: string): string {
  const fallback = "/minha-conta";
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
  if (/[\\\u0000-\u001f\u007f]/.test(value) || /%(?:2f|5c)/i.test(value)) return fallback;

  try {
    const destination = new URL(value, origin);
    if (destination.origin !== origin) return fallback;
    return `${destination.pathname}${destination.search}${destination.hash}`;
  } catch {
    return fallback;
  }
}
