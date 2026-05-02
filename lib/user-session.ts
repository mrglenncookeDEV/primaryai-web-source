import { getAuthSession } from "@/lib/auth";

export async function getCurrentUserSession() {
  return getAuthSession();
}
