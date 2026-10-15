import { createNeonServerAuth } from "@/lib/neon/auth-server";

const auth = createNeonServerAuth();
export const { GET, POST } = auth.handler();
