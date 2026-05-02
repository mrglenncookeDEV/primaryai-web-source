import { cache } from "react";
import { auth, currentUser } from "@clerk/nextjs/server";

export const getAuthSession = cache(async function getAuthSession() {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await currentUser();
  if (!user) return null;

  const email =
    user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)
      ?.emailAddress ??
    user.emailAddresses[0]?.emailAddress ??
    "";

  return {
    userId,
    email,
    role: "authenticated",
  };
});
